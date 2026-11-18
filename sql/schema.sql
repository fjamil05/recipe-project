
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipes belong to one user. Ingredients/instructions are stored as JSON arrays.
-- share_token is created the first time someone asks for a share link.
CREATE TABLE IF NOT EXISTS Recipes (
    recipe_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    time_minutes INT NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    rating VARCHAR(20) NOT NULL,
    ingredients LONGTEXT NOT NULL,
    instructions LONGTEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    share_token CHAR(32) NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_recipe_name_per_user (user_id, name),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Boards group a user's recipes. visibility is 'Private' or 'Shared'
-- (Shared boards show up for everyone on the Search page).
CREATE TABLE IF NOT EXISTS Boards (
    board_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    client_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'Private',
    cover_photo MEDIUMTEXT NULL,
    position INT NOT NULL DEFAULT 0,
    share_token CHAR(32) NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_board_per_user (user_id, client_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Which recipes are in which board, in order.
CREATE TABLE IF NOT EXISTS BoardRecipes (
    board_id INT NOT NULL,
    recipe_id INT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    PRIMARY KEY (board_id, recipe_id),
    FOREIGN KEY (board_id) REFERENCES Boards(board_id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES Recipes(recipe_id) ON DELETE CASCADE
);
