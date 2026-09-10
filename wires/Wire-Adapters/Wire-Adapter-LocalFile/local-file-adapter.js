/**
 * AI Native Trust Infrastructure
 * Wire Adapter: Local File
 *
 * Responsibility:
 * - Provide a storage interface for local persistence
 * - Communicate with the backend API
 * - Hide storage implementation from Smart Black Boxes
 */

export class LocalFileAdapter {

    constructor(baseUrl = "http://127.0.0.1:8000") {

        this.name = "LocalFileAdapter";
        this.baseUrl = baseUrl;

    }


    /**
     * Save an identity.
     */
    async saveIdentity(identity) {

        const response = await fetch(
            `${this.baseUrl}/api/identities`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(identity)
            }
        );

        if (!response.ok) {
            throw new Error("Failed to save identity.");
        }

        return await response.json();
    }


    /**
     * Get an identity by ID.
     */
    async getIdentity(identityId) {

        const response = await fetch(
            `${this.baseUrl}/api/identities/${identityId}`
        );

        if (!response.ok) {
            throw new Error("Identity not found.");
        }

        return await response.json();
    }


    /**
     * List all identities.
     */
    async listIdentities() {

        const response = await fetch(
            `${this.baseUrl}/api/identities`
        );

        if (!response.ok) {
            throw new Error("Failed to load identities.");
        }

        return await response.json();
    }


    /**
     * Update an identity.
     */
    async updateIdentity(identityId, identityData) {

        const response = await fetch(
            `${this.baseUrl}/api/identities/${identityId}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(identityData)
            }
        );

        if (!response.ok) {
            throw new Error("Failed to update identity.");
        }

        return await response.json();
    }


    /**
     * Delete an identity.
     */
    async deleteIdentity(identityId) {

        const response = await fetch(
            `${this.baseUrl}/api/identities/${identityId}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error("Failed to delete identity.");
        }

        return await response.json();
    }


    /**
     * Adapter metadata.
     */
    getInfo() {

        return {
            name: this.name,
            type: "local-file",
            version: "1.0.0"
        };
    }

}
