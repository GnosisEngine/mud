Our integration tests are found in `<projectRoot>/tests`

The `<projectRoot>/tests/harness` folder contains all the boostraps we need for testing

The `<projectRoot>/tests/integration` is where the integration tests actually exist.

Our usage of `better-sqlite3` in the `<projectRoot>/bundles/claims` bundles does not have to be mocked.  The code automatically knows to use a dedicated `test.db` when the `NODE_ENV` is set to `test` (Which it will be when we run `npm test`)  If you'd like, you can delete the test.db at the beginning of the full test run so you can ensuer its clean every time we run a test.  Otherwise, you'll be stuck in a rut trying to figure out `node-gyp` and C++ bindings, so let's just let the code automatically use the dedicated `test.db` instead.