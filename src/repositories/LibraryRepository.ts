
import { randomBytes } from "node:crypto";
import pool from "../database.js";

// Same shape the frontend already uses for saved recipes.
// "id" is the database id (sent to the browser, ignored when saving).
export interface RecipeData {
    id?: number;
    name: string;
    category: string;
    time: number;
    difficulty: string;
    rating: string;
    ingredients: string[];
    instructions: string[];
}

// Same shape the frontend already uses for boards.
// "id" is the board's id in the browser (Date.now() when it was created).
export interface BoardData {
    id: number;
    name: string;
    visibility: string;
    recipes: string[];
    coverPhoto?: string | undefined;
}

export interface Library {
    savedRecipes: RecipeData[];
    recipeBoards: BoardData[];
}

export interface CommunityRecipe extends RecipeData {
    owner: string;
    boardName: string;
    averageStars: number | null;
    reviewCount: number;
}

export type SharedItem =
    | { type: "recipe"; owner: string; recipe: RecipeData }
    | {
        type: "board";
        owner: string;
        board: { name: string; coverPhoto?: string | undefined; recipes: RecipeData[] };
    };

export const RECIPE_COLUMNS =
    "r.recipe_id, r.name, r.category, r.time_minutes, r.difficulty, r.rating, r.ingredients, r.instructions";

const MAX_PHOTO_LENGTH = 3_000_000;

function parseList(json: string): string[] {
    try {
        const value: unknown = JSON.parse(json);
        return Array.isArray(value) ? value.map(String) : [];
    } catch {
        return [];
    }
}

export function toRecipe(row: any): RecipeData {
    return {
        id: row.recipe_id,
        name: row.name,
        category: row.category,
        time: Number(row.time_minutes),
        difficulty: row.difficulty,
        rating: row.rating,
        ingredients: parseList(row.ingredients),
        instructions: parseList(row.instructions)
    };
}

function text(value: unknown, maxLength: number): string {
    return String(value ?? "").trim().slice(0, maxLength);
}

function photo(value: unknown): string | undefined {
    return typeof value === "string" && value.startsWith("data:image/") && value.length <= MAX_PHOTO_LENGTH
        ? value
        : undefined;
}

// Checks and cleans data coming from the browser before it touches the database
function cleanRecipes(input: unknown): RecipeData[] {
    if (!Array.isArray(input)) {
        throw new Error("savedRecipes must be a list");
    }

    const seen = new Set<string>();
    const recipes: RecipeData[] = [];

    for (const item of input) {
        const name = text(item?.name, 150);
        if (!name || seen.has(name.toLowerCase())) {
            continue;
        }
        seen.add(name.toLowerCase());

        recipes.push({
            name,
            category: text(item.category, 50),
            time: Math.max(0, Math.round(Number(item.time) || 0)),
            difficulty: text(item.difficulty, 20),
            rating: text(item.rating, 20),
            ingredients: Array.isArray(item.ingredients) ? item.ingredients.map(String) : [],
            instructions: Array.isArray(item.instructions) ? item.instructions.map(String) : []
        });
    }

    return recipes;
}

function cleanBoards(input: unknown): BoardData[] {
    if (!Array.isArray(input)) {
        throw new Error("recipeBoards must be a list");
    }

    const seen = new Set<number>();
    const boards: BoardData[] = [];

    for (const item of input) {
        const id = Number(item?.id);
        const name = text(item?.name, 100);
        if (!Number.isSafeInteger(id) || !name || seen.has(id)) {
            continue;
        }
        seen.add(id);

        boards.push({
            id,
            name,
            visibility: item.visibility === "Shared" ? "Shared" : "Private",
            recipes: Array.isArray(item.recipes) ? item.recipes.map((r: unknown) => text(r, 150)) : [],
            coverPhoto: photo(item.coverPhoto)
        });
    }

    return boards;
}

async function recipesInBoard(boardId: number): Promise<RecipeData[]> {
    const rows = await pool.query(
        `SELECT ${RECIPE_COLUMNS}
         FROM BoardRecipes br JOIN Recipes r ON r.recipe_id = br.recipe_id
         WHERE br.board_id = ?
         ORDER BY br.position`,
        [boardId]
    );
    return rows.map(toRecipe);
}

export class LibraryRepository {

    // Everything a user has saved, in the same format the pages already use
    public async getLibrary(userId: number): Promise<Library> {
        const recipeRows = await pool.query(
            `SELECT ${RECIPE_COLUMNS} FROM Recipes r WHERE r.user_id = ? ORDER BY r.position, r.recipe_id`,
            [userId]
        );

        const boardRows = await pool.query(
            `SELECT board_id, client_id, name, visibility, cover_photo
             FROM Boards WHERE user_id = ? ORDER BY position, board_id`,
            [userId]
        );

        // Only the owner's own recipes; recipes collaborators added are
        // shown in the Collaborative Boards section instead
        const memberRows = await pool.query(
            `SELECT br.board_id, r.name
             FROM BoardRecipes br
             JOIN Boards b ON b.board_id = br.board_id
             JOIN Recipes r ON r.recipe_id = br.recipe_id
             WHERE b.user_id = ? AND r.user_id = ?
             ORDER BY br.position`,
            [userId, userId]
        );

        const recipesByBoard = new Map<number, string[]>();
        for (const row of memberRows) {
            const list = recipesByBoard.get(row.board_id) ?? [];
            list.push(row.name);
            recipesByBoard.set(row.board_id, list);
        }

        return {
            savedRecipes: recipeRows.map(toRecipe),
            recipeBoards: boardRows.map((row: any) => ({
                id: Number(row.client_id),
                name: row.name,
                visibility: row.visibility,
                recipes: recipesByBoard.get(row.board_id) ?? [],
                ...(row.cover_photo ? { coverPhoto: row.cover_photo } : {})
            }))
        };
    }

    // Replaces the user's saved recipes and boards with what the browser sent.
    // Recipes are matched by name and boards by id, so share links and reviews survive edits.
    public async saveLibrary(userId: number, input: { savedRecipes: unknown; recipeBoards: unknown }): Promise<void> {
        const recipes = cleanRecipes(input.savedRecipes);
        const boards = cleanBoards(input.recipeBoards);

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Save recipes
            for (const [position, recipe] of recipes.entries()) {
                await connection.query(
                    `INSERT INTO Recipes
                        (user_id, name, category, time_minutes, difficulty, rating, ingredients, instructions, position)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        name = VALUES(name), category = VALUES(category), time_minutes = VALUES(time_minutes),
                        difficulty = VALUES(difficulty), rating = VALUES(rating),
                        ingredients = VALUES(ingredients), instructions = VALUES(instructions),
                        position = VALUES(position)`,
                    [
                        userId, recipe.name, recipe.category, recipe.time, recipe.difficulty, recipe.rating,
                        JSON.stringify(recipe.ingredients), JSON.stringify(recipe.instructions),
                        position
                    ]
                );
            }

            // 2. Delete recipes that were removed in the browser
            if (recipes.length > 0) {
                await connection.query(
                    "DELETE FROM Recipes WHERE user_id = ? AND name NOT IN (?)",
                    [userId, recipes.map((recipe) => recipe.name)]
                );
            } else {
                await connection.query("DELETE FROM Recipes WHERE user_id = ?", [userId]);
            }

            const recipeIdRows = await connection.query(
                "SELECT recipe_id, name FROM Recipes WHERE user_id = ?",
                [userId]
            );
            const recipeIds = new Map<string, number>();
            for (const row of recipeIdRows) {
                recipeIds.set(String(row.name).toLowerCase(), row.recipe_id);
            }

            // 3. Save boards
            for (const [position, board] of boards.entries()) {
                await connection.query(
                    `INSERT INTO Boards (user_id, client_id, name, visibility, cover_photo, position)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        name = VALUES(name), visibility = VALUES(visibility),
                        cover_photo = VALUES(cover_photo), position = VALUES(position)`,
                    [userId, board.id, board.name, board.visibility, board.coverPhoto ?? null, position]
                );
            }

            // 4. Delete boards that were removed in the browser
            if (boards.length > 0) {
                await connection.query(
                    "DELETE FROM Boards WHERE user_id = ? AND client_id NOT IN (?)",
                    [userId, boards.map((board) => board.id)]
                );
            } else {
                await connection.query("DELETE FROM Boards WHERE user_id = ?", [userId]);
            }

            const boardIdRows = await connection.query(
                "SELECT board_id, client_id FROM Boards WHERE user_id = ?",
                [userId]
            );
            const boardIds = new Map<number, number>();
            for (const row of boardIdRows) {
                boardIds.set(Number(row.client_id), row.board_id);
            }

            // 5. Save which of the owner's recipes are in each board
            //    (recipes collaborators added are left alone)
            for (const board of boards) {
                const boardId = boardIds.get(board.id);
                if (boardId === undefined) {
                    continue;
                }

                await connection.query(
                    `DELETE br FROM BoardRecipes br
                     JOIN Recipes r ON r.recipe_id = br.recipe_id
                     WHERE br.board_id = ? AND r.user_id = ?`,
                    [boardId, userId]
                );

                const added = new Set<number>();
                for (const [position, recipeName] of board.recipes.entries()) {
                    const recipeId = recipeIds.get(recipeName.toLowerCase());
                    if (recipeId === undefined || added.has(recipeId)) {
                        continue;
                    }
                    added.add(recipeId);

                    await connection.query(
                        "INSERT INTO BoardRecipes (board_id, recipe_id, position) VALUES (?, ?, ?)",
                        [boardId, recipeId, position]
                    );
                }
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Recipes in other users' Shared boards, for the Search page
    public async getCommunityRecipes(userId: number): Promise<CommunityRecipe[]> {
        const rows = await pool.query(
            `SELECT ${RECIPE_COLUMNS}, u.username AS owner, b.name AS board_name,
                    (SELECT AVG(stars) FROM Reviews rv WHERE rv.recipe_id = r.recipe_id) AS average_stars,
                    (SELECT COUNT(*) FROM Reviews rv WHERE rv.recipe_id = r.recipe_id) AS review_count
             FROM Boards b
             JOIN BoardRecipes br ON br.board_id = b.board_id
             JOIN Recipes r ON r.recipe_id = br.recipe_id
             JOIN Users u ON u.user_id = r.user_id
             WHERE b.visibility = 'Shared' AND r.user_id <> ?
             ORDER BY b.created_at DESC, br.position`,
            [userId]
        );

        const seen = new Set<number>();
        const recipes: CommunityRecipe[] = [];
        for (const row of rows) {
            if (seen.has(row.recipe_id)) {
                continue;
            }
            seen.add(row.recipe_id);
            recipes.push({
                ...toRecipe(row),
                owner: row.owner,
                boardName: row.board_name,
                averageStars: row.average_stars === null ? null : Number(row.average_stars),
                reviewCount: Number(row.review_count)
            });
        }
        return recipes;
    }

    // Returns the share token for one of the user's recipes (by name) or boards (by id),
    // creating it the first time. Returns null if the item doesn't exist.
    public async getShareToken(userId: number, type: "recipe" | "board", key: string): Promise<string | null> {
        const newToken = randomBytes(16).toString("hex");

        const table = type === "recipe" ? "Recipes" : "Boards";
        const keyColumn = type === "recipe" ? "name" : "client_id";

        await pool.query(
            `UPDATE ${table} SET share_token = COALESCE(share_token, ?) WHERE user_id = ? AND ${keyColumn} = ?`,
            [newToken, userId, key]
        );

        const rows = await pool.query(
            `SELECT share_token FROM ${table} WHERE user_id = ? AND ${keyColumn} = ?`,
            [userId, key]
        );

        return rows[0]?.share_token ?? null;
    }

    // Looks up whatever a share link points to. Anyone with the link can view it.
    public async getShared(token: string): Promise<SharedItem | null> {
        const recipeRows = await pool.query(
            `SELECT ${RECIPE_COLUMNS}, u.username AS owner
             FROM Recipes r JOIN Users u ON u.user_id = r.user_id
             WHERE r.share_token = ?`,
            [token]
        );

        if (recipeRows[0]) {
            return { type: "recipe", owner: recipeRows[0].owner, recipe: toRecipe(recipeRows[0]) };
        }

        const boardRows = await pool.query(
            `SELECT b.board_id, b.name, b.cover_photo, u.username AS owner
             FROM Boards b JOIN Users u ON u.user_id = b.user_id
             WHERE b.share_token = ?`,
            [token]
        );

        const board = boardRows[0];
        if (!board) {
            return null;
        }

        return {
            type: "board",
            owner: board.owner,
            board: {
                name: board.name,
                coverPhoto: board.cover_photo ?? undefined,
                recipes: await recipesInBoard(board.board_id)
            }
        };
    }
}
