/**
 * Ordered side-effect entrypoint for the built-in provider registry.
 *
 * Only Fibonacci is registered in this build. The other provider definitions
 * under ./definitions remain in the codebase on purpose — shared plumbing
 * (api-style, image-models, custom-provider wrappers) imports from them — but
 * none of them register into the provider list, so the UI exposes Fibonacci
 * plus any user-added custom providers.
 */
import './definitions/fibonacci'
