
export class User {
    private userId: number;
    private username: string;
    private email: string;

    constructor(userId: number, username: string, email: string) {
        this.userId = userId;
        this.username = username;
        this.email = email;
    }

    public getUserId(): number {
        return this.userId;
    }

    public getUsername(): string {
        return this.username;
    }

    public setUsername(username: string): void {
        this.username = username;
    }

    public getEmail(): string {
        return this.email;
    }

    public setEmail(email: string): void {
        this.email = email;
    }

    public toString(): string {
        return `User ID: ${this.userId}, Username: ${this.username}, Email: ${this.email}`;
    }
}
