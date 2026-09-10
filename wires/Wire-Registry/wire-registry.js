/**
 * AI Native Trust Infrastructure
 * Wire Registry
 *
 * Responsibility:
 * - Register infrastructure adapters
 * - Resolve adapters by name
 * - Decouple Smart Black Boxes from infrastructure
 */

export class WireRegistry {

    constructor() {

        this.wires = new Map();

    }


    /**
     * Register a Wire Adapter.
     *
     * @param {string} name
     * @param {object} adapter
     */
    register(name, adapter) {

        if (!name) {
            throw new Error("Wire name is required.");
        }

        if (!adapter) {
            throw new Error("Wire adapter is required.");
        }

        this.wires.set(name, adapter);

        return {
            success: true,
            wire: name
        };
    }


    /**
     * Get a registered Wire Adapter.
     *
     * @param {string} name
     */
    resolve(name) {

        if (!this.wires.has(name)) {
            throw new Error(
                `Wire '${name}' is not registered.`
            );
        }

        return this.wires.get(name);
    }


    /**
     * Check whether a Wire exists.
     */
    has(name) {

        return this.wires.has(name);
    }


    /**
     * List all registered Wires.
     */
    list() {

        return Array.from(this.wires.keys());
    }


    /**
     * Remove a Wire.
     */
    unregister(name) {

        return this.wires.delete(name);
    }


    /**
     * Clear all registered Wires.
     */
    clear() {

        this.wires.clear();

        return {
            success: true
        };
    }

}
