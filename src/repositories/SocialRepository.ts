
import pool from "../database.js";
import { RECIPE_COLUMNS, toRecipe, type RecipeData } from "./LibraryRepository.js";

export interface Review {
    id: number;
    username: string;
    stars: number;
    comment: string;
    createdAt: string;
    isMine: boolean;
}

export interface ReviewSummary {
    averageStars: number | null;
    reviewCount: number;
    reviews: Review[];
    canReview: boolean;
}

export interface CollaborativeBoard {
    boardId: number;
    name: string;
    owner: string;
    isOwner: boolean;
    members: string[];
    recipes: (RecipeData & { addedBy: string; addedByMe: boolean })[];
}

// Users can see a recipe if they own it, it's in a Shared board, it has a share link,
// or it's in a board they collaborate on.
async function canViewRecipe(recipeId: number, userId: number | null): Promise<{ visible: boolean; ownerId: number | null }> {
    const rows = await pool.query(
        `SELECT r.user_id,
            r.share_token IS NOT NULL AS has_link,
            EXISTS (
                SELECT 1 FROM BoardRecipes br JOIN Boards b ON b.board_id = br.board_id
                WHERE br.recipe_id = r.recipe_id AND b.visibility = 'Shared'
            ) AS in_shared_board,
            EXISTS (
                SELECT 1 FROM BoardRecipes br
                JOIN Boards b ON b.board_id = br.board_id
                LEFT JOIN BoardMembers bm ON bm.board_id = b.board_id AND bm.user_id = ?
                WHERE br.recipe_id = r.recipe_id AND (bm.user_id IS NOT NULL OR b.user_id = ?)
            ) AS in_my_collab_board
         FROM Recipes r WHERE r.recipe_id = ?`,
        [userId ?? 0, userId ?? 0, recipeId]
    );

    const row = rows[0];
    if (!row) {
        return { visible: false, ownerId: null };
    }

    const visible =
        row.user_id === userId || Boolean(Number(row.has_link)) ||
        Boolean(Number(row.in_shared_board)) || Boolean(Number(row.in_my_collab_board));

    return { visible, ownerId: row.user_id };
}

async function boardForOwner(ownerId: number, clientBoardId: string): Promise<number | null> {
    const rows = await pool.query(
        "SELECT board_id FROM Boards WHERE user_id = ? AND client_id = ?",
        [ownerId, clientBoardId]
    );
    return rows[0]?.board_id ?? null;
}

export class SocialRepository {

    // ===================== Reviews =====================

    public async getReviews(recipeId: number, userId: number | null): Promise<ReviewSummary | null> {
        const access = await canViewRecipe(recipeId, userId);
        if (!access.visible) {
            return null;
        }

        const rows = await pool.query(
            `SELECT rv.review_id, rv.user_id, u.username, rv.stars, rv.comment, rv.created_at
             FROM Reviews rv JOIN Users u ON u.user_id = rv.user_id
             WHERE rv.recipe_id = ?
             ORDER BY rv.created_at DESC`,
            [recipeId]
        );

        const reviews: Review[] = rows.map((row: any) => ({
            id: row.review_id,
            username: row.username,
            stars: Number(row.stars),
            comment: row.comment,
            createdAt: new Date(row.created_at).toISOString(),
            isMine: row.user_id === userId
        }));

        const total = reviews.reduce((sum, review) => sum + review.stars, 0);

        return {
            averageStars: reviews.length ? Math.round((total / reviews.length) * 10) / 10 : null,
            reviewCount: reviews.length,
            reviews,
            canReview: userId !== null && access.ownerId !== userId
        };
    }

    // Reviews on one of your own recipes, looked up by name
    public async getReviewsForMyRecipe(userId: number, name: string): Promise<ReviewSummary | null> {
        const rows = await pool.query(
            "SELECT recipe_id FROM Recipes WHERE user_id = ? AND name = ?",
            [userId, name]
        );
        return rows[0] ? this.getReviews(rows[0].recipe_id, userId) : null;
    }

    // Adds a review, or updates yours if you already left one
    public async saveReview(recipeId: number, userId: number, stars: number, comment: string): Promise<string | null> {
        const access = await canViewRecipe(recipeId, userId);
        if (!access.visible) {
            return "That recipe isn't shared.";
        }
        if (access.ownerId === userId) {
            return "You can't review your own recipe.";
        }

        await pool.query(
            `INSERT INTO Reviews (recipe_id, user_id, stars, comment) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE stars = VALUES(stars), comment = VALUES(comment), created_at = CURRENT_TIMESTAMP`,
            [recipeId, userId, stars, comment]
        );
        return null;
    }

    public async deleteReview(recipeId: number, userId: number): Promise<void> {
        await pool.query("DELETE FROM Reviews WHERE recipe_id = ? AND user_id = ?", [recipeId, userId]);
    }

    // ===================== Collaborators =====================

    public async listMembers(ownerId: number, clientBoardId: string): Promise<string[] | null> {
        const boardId = await boardForOwner(ownerId, clientBoardId);
        if (boardId === null) {
            return null;
        }

        const rows = await pool.query(
            `SELECT u.username FROM BoardMembers bm JOIN Users u ON u.user_id = bm.user_id
             WHERE bm.board_id = ? ORDER BY bm.added_at`,
            [boardId]
        );
        return rows.map((row: any) => row.username);
    }

    // Returns an error message, or null if it worked
    public async addMember(ownerId: number, clientBoardId: string, username: string): Promise<string | null> {
        const boardId = await boardForOwner(ownerId, clientBoardId);
        if (boardId === null) {
            return "That board hasn't been saved yet. Try again in a moment.";
        }

        const users = await pool.query("SELECT user_id FROM Users WHERE username = ?", [username]);
        if (!users[0]) {
            return `No user named "${username}".`;
        }
        if (users[0].user_id === ownerId) {
            return "You already own this board.";
        }

        await pool.query(
            "INSERT IGNORE INTO BoardMembers (board_id, user_id) VALUES (?, ?)",
            [boardId, users[0].user_id]
        );
        return null;
    }

    public async removeMember(ownerId: number, clientBoardId: string, username: string): Promise<void> {
        const boardId = await boardForOwner(ownerId, clientBoardId);
        if (boardId === null) {
            return;
        }

        await pool.query(
            `DELETE bm FROM BoardMembers bm JOIN Users u ON u.user_id = bm.user_id
             WHERE bm.board_id = ? AND u.username = ?`,
            [boardId, username]
        );

        // Take their recipes out of the board too
        await pool.query(
            `DELETE br FROM BoardRecipes br
             JOIN Recipes r ON r.recipe_id = br.recipe_id
             JOIN Users u ON u.user_id = r.user_id
             WHERE br.board_id = ? AND u.username = ?`,
            [boardId, username]
        );
    }

    // Boards you own that have collaborators, plus boards you were added to
    public async getCollaborativeBoards(userId: number): Promise<CollaborativeBoard[]> {
        const boardRows = await pool.query(
            `SELECT b.board_id, b.name, b.user_id AS owner_id, u.username AS owner
             FROM Boards b JOIN Users u ON u.user_id = b.user_id
             WHERE b.board_id IN (SELECT board_id FROM BoardMembers WHERE user_id = ?)
                OR (b.user_id = ? AND EXISTS (SELECT 1 FROM BoardMembers bm WHERE bm.board_id = b.board_id))
             ORDER BY b.created_at`,
            [userId, userId]
        );

        const boards: CollaborativeBoard[] = [];

        for (const board of boardRows) {
            const members = await pool.query(
                `SELECT u.username FROM BoardMembers bm JOIN Users u ON u.user_id = bm.user_id
                 WHERE bm.board_id = ? ORDER BY bm.added_at`,
                [board.board_id]
            );

            const recipes = await pool.query(
                `SELECT ${RECIPE_COLUMNS}, r.user_id AS added_by_id, u.username AS added_by
                 FROM BoardRecipes br
                 JOIN Recipes r ON r.recipe_id = br.recipe_id
                 JOIN Users u ON u.user_id = r.user_id
                 WHERE br.board_id = ?
                 ORDER BY br.position`,
                [board.board_id]
            );

            boards.push({
                boardId: board.board_id,
                name: board.name,
                owner: board.owner,
                isOwner: board.owner_id === userId,
                members: members.map((row: any) => row.username),
                recipes: recipes.map((row: any) => ({
                    ...toRecipe(row),
                    addedBy: row.added_by,
                    addedByMe: row.added_by_id === userId
                }))
            });
        }

        return boards;
    }

    private async isMember(boardId: number, userId: number): Promise<boolean> {
        const rows = await pool.query(
            "SELECT 1 FROM BoardMembers WHERE board_id = ? AND user_id = ?",
            [boardId, userId]
        );
        return rows.length > 0;
    }

    // A collaborator adds one of their own recipes (by name) to a board they were added to
    public async addRecipeToBoard(userId: number, boardId: number, recipeName: string): Promise<string | null> {
        if (!(await this.isMember(boardId, userId))) {
            return "You're not a collaborator on that board.";
        }

        const recipes = await pool.query(
            "SELECT recipe_id FROM Recipes WHERE user_id = ? AND name = ?",
            [userId, recipeName]
        );
        if (!recipes[0]) {
            return "Save the recipe first, then add it.";
        }

        await pool.query(
            `INSERT IGNORE INTO BoardRecipes (board_id, recipe_id, position)
             SELECT ?, ?, COALESCE(MAX(position), -1) + 1 FROM BoardRecipes WHERE board_id = ?`,
            [boardId, recipes[0].recipe_id, boardId]
        );
        return null;
    }

    // Owners can remove anything a collaborator added; collaborators can remove their own recipes
    public async removeRecipeFromBoard(userId: number, boardId: number, recipeId: number): Promise<string | null> {
        const rows = await pool.query(
            `SELECT b.user_id AS owner_id, r.user_id AS recipe_owner_id
             FROM BoardRecipes br
             JOIN Boards b ON b.board_id = br.board_id
             JOIN Recipes r ON r.recipe_id = br.recipe_id
             WHERE br.board_id = ? AND br.recipe_id = ?`,
            [boardId, recipeId]
        );

        const row = rows[0];
        if (!row) {
            return null;
        }

        const isOwner = row.owner_id === userId;
        const isTheirRecipe = row.recipe_owner_id === userId;

        if (isOwner && isTheirRecipe) {
            return "Remove your own recipes from the board on your Boards page.";
        }
        if (!isOwner && !(isTheirRecipe && (await this.isMember(boardId, userId)))) {
            return "You can only remove recipes you added.";
        }

        await pool.query("DELETE FROM BoardRecipes WHERE board_id = ? AND recipe_id = ?", [boardId, recipeId]);
        return null;
    }

    // Everyone you share at least one board with
    public async getCollaborators(userId: number): Promise<string[]> {
        const rows = await pool.query(
            `SELECT DISTINCT u.username
             FROM Boards b
             JOIN BoardMembers bm ON bm.board_id = b.board_id
             JOIN Users u ON u.user_id IN (b.user_id, bm.user_id)
             WHERE (b.user_id = ? OR b.board_id IN (SELECT board_id FROM BoardMembers WHERE user_id = ?))
               AND u.user_id <> ?
             ORDER BY u.username`,
            [userId, userId, userId]
        );
        return rows.map((row: any) => row.username);
    }

    // ===================== Per-user data =====================

    public async getUserData(userId: number): Promise<Record<string, string>> {
        const rows = await pool.query("SELECT data_key, value FROM UserData WHERE user_id = ?", [userId]);
        const data: Record<string, string> = {};
        for (const row of rows) {
            data[row.data_key] = row.value;
        }
        return data;
    }

    public async setUserData(userId: number, key: string, value: string | null): Promise<void> {
        if (value === null) {
            await pool.query("DELETE FROM UserData WHERE user_id = ? AND data_key = ?", [userId, key]);
            return;
        }

        await pool.query(
            `INSERT INTO UserData (user_id, data_key, value) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE value = VALUES(value)`,
            [userId, key, value]
        );
    }
}
