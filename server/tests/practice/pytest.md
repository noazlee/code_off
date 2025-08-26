# Pytest Notes: 
## https://www.youtube.com/watch?v=EgpLj86ZHFQ

`pip install pytest`
`pip install pytest-mock`

1. Make testing file `test_{name of module}`
* Import function, test with `test_{name of function}` -> assert [condition]
2. Run test with `pytest test_{name of module}`

### Unit Test
Smallest type of test and it's typically testing one very small component of code - functions, method..
Ensure you get expected result from small unit from code - able to isolate error in code which we can fix.

Other tests: intergration tests, system tests, end-to-end tests