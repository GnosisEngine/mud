Our integration tests are found in `<projectRoot>/tests`

The `<projectRoot>/tests/harness` folder contains all the boostraps we need for testing

The `<projectRoot>/tests/integration` is where the integration tests actually exist.

Our usage of `sql.js` in the `<projectRoot>/bundles/claims` bundles does not have to be mocked.  The code automatically knows to use a dedicated `test.db` when the `NODE_ENV` is set to `test` (Which it will be when we run `npm test`)  If you'd like, you can delete the test.db at the beginning of the full test run so you can ensure its clean every time we run a test.