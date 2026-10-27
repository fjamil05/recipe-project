
import { testConnection } from "./database.js";
import { UserRepository } from "./repositories/UserRepository.js";

async function main(): Promise<void> {
    console.log("Starting Recipe Tracker...");

    await testConnection();

    const userRepository = new UserRepository();

    // Retrieve all existing users
    const users = await userRepository.findAll();

    console.log("Users in database:", users.length);

    for (const user of users) {
        console.log(user.toString());
    }
}

main().catch(console.error);
