Run the following commands to get a context on the code we are going to work with:

```
git clone https://github.com/GnosisEngine/mud
cd mud
find . -type d -name "test" -exec rm -rf {} +
find . -type d -name "tests" -exec rm -rf {} +
rm -rf data
rm -f bundles/world/data/world.json
find . -type d -name "docs" -exec rm -rf {} +
```
If we explore an idea to code, please see the guidance codument at `prompts/codeplan.md`

If we decide to build a bundle, please see the guidance document at `prompts/bundles.md`

When you are done, simply let me know you're ready for the next action.