CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(20) UNIQUE NOT NULL,
    password BYTEA NOT NULL,
    salt BYTEA NOT NULL,
    created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    num_wins INTEGER DEFAULT 0
);

CREATE TABLE coding_problems (
    problem_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    test_cases JSONB NOT NULL,
    solution_template TEXT,
    created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_history (
    game_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(6) NOT NULL,
    player1_id UUID REFERENCES users(user_id),
    player2_id UUID REFERENCES users(user_id),
    winner_id UUID REFERENCES users(user_id),
    problem_id UUID REFERENCES coding_problems(problem_id),
    player1_questions_answered INTEGER DEFAULT 0,
    player2_questions_answered INTEGER DEFAULT 0,
    player1_final_health INTEGER DEFAULT 0,
    player2_final_health INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    played_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Coding Problems
INSERT INTO coding_problems (title, description, difficulty, test_cases, solution_template) VALUES

-- Easy Problems
('Hello World', 'Complete the function to return "Hello World". Make sure the output matches exactly.', 'easy',
'[{"input": {}, "expected_output": "Hello World"}]'::jsonb,
'def hello_world():\n    # Your code here\n    '),

('Print 1 to 5', 'Complete the function to return a string with numbers from 1 to 5, each on a new line.', 'easy',
'[{"input": {}, "expected_output": "1\n2\n3\n4\n5"}]'::jsonb,
'def print_numbers():\n    # Your code here\n    '),

('Print 10 to 1', 'Complete the function to return a string with numbers from 10 to 1 in descending order, each on a new line.', 'easy',
'[{"input": {}, "expected_output": "10\n9\n8\n7\n6\n5\n4\n3\n2\n1"}]'::jsonb,
'def countdown():\n    # Your code here\n    '),

('Variable X Plus 3', 'Complete the function to return the value of x + 3, where x is 7.', 'easy',
'[{"input": {}, "expected_output": 10}]'::jsonb,
'def add_three():\n    # Set x to 7 and return x + 3\n    '),

('If Greater Than 10', 'Complete the function that returns "Yes" if the input number is greater than 10, otherwise return empty string.', 'easy',
'[{"input": {"num": 15}, "expected_output": "Yes"}, {"input": {"num": 8}, "expected_output": ""}]'::jsonb,
'def check_greater(num):\n    # Your code here\n    '),

('Hello Three Times', 'Complete the function to return "Hello" three times, each on a new line.', 'easy',
'[{"input": {}, "expected_output": "Hello\nHello\nHello"}]'::jsonb,
'def hello_three():\n    # Your code here\n    '),

('Boolean True', 'Complete the function to return True (as a boolean).', 'easy',
'[{"input": {}, "expected_output": true}]'::jsonb,
'def is_sunny():\n    # Set is_sunny to True and return it\n    '),

-- Medium Problems  
('Sum Array', 'Complete the function to return the sum of all numbers in a list.', 'medium',
'[{"input": {"arr": [1,2,3,4,5]}, "expected_output": 15}, {"input": {"arr": [10,20,30]}, "expected_output": 60}, {"input": {"arr": [-1,1,0]}, "expected_output": 0}]'::jsonb,
'def sum_array(arr):\n    # Your code here\n    '),

('FizzBuzz', 'Complete the function to return FizzBuzz from 1 to n. For multiples of 3 return "Fizz", for multiples of 5 return "Buzz", for multiples of both return "FizzBuzz", otherwise the number. Each on a new line.', 'medium',
'[{"input": {"n": 5}, "expected_output": "1\n2\nFizz\n4\nBuzz"}]'::jsonb,
'def fizzbuzz(n):\n    # Your code here\n    '),

('Multiply Two Numbers', 'Complete the function that returns the product of two integers.', 'medium',
'[{"input": {"a": 2, "b": 5}, "expected_output": 10}, {"input": {"a": 3, "b": 7}, "expected_output": 21}]'::jsonb,
'def multiply(a, b):\n    # Your code here\n    '),

('Square Number', 'Complete the function that returns the square of a number.', 'medium',
'[{"input": {"n": 4}, "expected_output": 16}, {"input": {"n": 7}, "expected_output": 49}]'::jsonb,
'def square(n):\n    # Your code here\n    '),

('Sum 1 to 100', 'Complete the function that returns the sum of integers from 1 to 100.', 'medium',
'[{"input": {}, "expected_output": 5050}]'::jsonb,
'def sum_to_hundred():\n    # Your code here\n    '),

('Double List', 'Complete the function that returns a new list with all values doubled.', 'medium',
'[{"input": {"lst": [3, 6, 9, 12]}, "expected_output": [6, 12, 18, 24]}, {"input": {"lst": [1, 2, 3]}, "expected_output": [2, 4, 6]}]'::jsonb,
'def double_list(lst):\n    # Your code here\n    '),

('Count Vowels', 'Complete the function that returns the number of vowels (a,e,i,o,u) in a string.', 'medium',
'[{"input": {"s": "hello"}, "expected_output": 2}, {"input": {"s": "python"}, "expected_output": 1}]'::jsonb,
'def count_vowels(s):\n    # Your code here\n    '),

('Find Maximum', 'Complete the function that returns the largest integer in a list.', 'medium',
'[{"input": {"lst": [3, 7, 2]}, "expected_output": 7}, {"input": {"lst": [10, 5, 15, 3]}, "expected_output": 15}]'::jsonb,
'def find_max(lst):\n    # Your code here\n    '),

-- Hard Problems
('Fibonacci Sequence', 'Complete the function to return the nth Fibonacci number. The Fibonacci sequence starts with 0, 1, and each subsequent number is the sum of the previous two.', 'hard',
'[{"input": {"n": 0}, "expected_output": 0}, {"input": {"n": 1}, "expected_output": 1}, {"input": {"n": 5}, "expected_output": 5}, {"input": {"n": 10}, "expected_output": 55}]'::jsonb,
'def fibonacci(n):\n    # Your code here\n    '),

('Two Sum', 'Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.', 'hard',
'[{"input": {"nums": [2, 7, 11, 15], "target": 9}, "expected_output": [0, 1]}, {"input": {"nums": [3, 2, 4], "target": 6}, "expected_output": [1, 2]}]'::jsonb,
'def two_sum(nums, target):\n    # Your code here\n    '),

('Length of Last Word', 'Given a string consisting of words and spaces, return the length of the last word.', 'hard',
'[{"input": {"s": "Hello World"}, "expected_output": 5}, {"input": {"s": "   fly me   to   the moon  "}, "expected_output": 4}]'::jsonb,
'def length_of_last_word(s):\n    # Your code here\n    '),

('Convert Temperature', 'Convert Celsius to both Kelvin and Fahrenheit. Return a list [kelvin, fahrenheit]. K = C + 273.15, F = C * (9/5) + 32', 'hard',
'[{"input": {"celsius": 36.50}, "expected_output": [309.65, 97.7]}, {"input": {"celsius": 0}, "expected_output": [273.15, 32.0]}]'::jsonb,
'def convert_temperature(celsius):\n    # Your code here\n    '),

('Smaller Numbers Than Current', 'For each number in an array, count how many numbers are smaller than it. Return the results in an array.', 'hard',
'[{"input": {"nums": [8,1,2,2,3]}, "expected_output": [4,0,1,1,3]}, {"input": {"nums": [6,5,4,8]}, "expected_output": [2,1,0,3]}]'::jsonb,
'def smaller_numbers_than_current(nums):\n    # Your code here\n    '),

('Number of Steps', 'Return the number of steps to reduce a number to zero. If even, divide by 2. If odd, subtract 1.', 'hard',
'[{"input": {"num": 14}, "expected_output": 6}, {"input": {"num": 8}, "expected_output": 4}]'::jsonb,
'def number_of_steps(num):\n    # Your code here\n    '),

('Sum of Multiples', 'Return the sum of all integers in [1, n] that are divisible by 3, 5, or 7.', 'hard',
'[{"input": {"n": 7}, "expected_output": 21}, {"input": {"n": 10}, "expected_output": 40}]'::jsonb,
'def sum_of_multiples(n):\n    # Your code here\n    '),

('Count Prefix', 'Given a list of strings words and a string prefix, return how many words start with that prefix.', 'hard',
'[{"input": {"words": ["pay","attention","practice","attend"], "pref": "at"}, "expected_output": 2}, {"input": {"words": ["apple","app","apricot","banana"], "pref": "app"}, "expected_output": 2}]'::jsonb,
'def prefix_count(words, pref):\n    # Your code here\n    '),

-- More Easy Problems
('Print Each Item', 'Complete the function to return each item in the list on its own line.', 'easy',
'[{"input": {"lst": [1,2,3]}, "expected_output": "1\n2\n3"}, {"input": {"lst": ["a","b","c"]}, "expected_output": "a\nb\nc"}]'::jsonb,
'def print_each(lst):\n    # Your code here\n    '),

('Print Even Numbers', 'Complete the function to return only the even numbers from 1 to 10, each on a new line.', 'easy',
'[{"input": {}, "expected_output": "2\n4\n6\n8\n10"}]'::jsonb,
'def print_evens():\n    # Your code here\n    '),

-- More Medium Problems
('Check Palindrome', 'Complete the function that returns True if the string is a palindrome, False otherwise. Case insensitive.', 'medium',
'[{"input": {"s": "racecar"}, "expected_output": true}, {"input": {"s": "hello"}, "expected_output": false}, {"input": {"s": "RaceCar"}, "expected_output": true}]'::jsonb,
'def is_palindrome(s):\n    # Your code here\n    '),

('Check Divisibility', 'Complete the function that returns "Yes" if the first number is divisible by the second, "No" otherwise.', 'medium',
'[{"input": {"a": 10, "b": 2}, "expected_output": "Yes"}, {"input": {"a": 10, "b": 3}, "expected_output": "No"}]'::jsonb,
'def check_divisible(a, b):\n    # Your code here\n    '),

-- More Hard Problems
('Sort by Height', 'Given arrays names and heights, return names sorted in descending order by height.', 'hard',
'[{"input": {"names": ["Mary","John","Emma"], "heights": [180,165,170]}, "expected_output": ["Mary","Emma","John"]}, {"input": {"names": ["Bob","Alice"], "heights": [170,175]}, "expected_output": ["Alice","Bob"]}]'::jsonb,
'def sort_people(names, heights):\n    # Your code here\n    '),

-- More Easy Problems
('Add Two Numbers', 'Complete the function to return the sum of two numbers.', 'easy',
'[{"input": {"a": 5, "b": 3}, "expected_output": 8}, {"input": {"a": 10, "b": 15}, "expected_output": 25}]'::jsonb,
'def add_numbers(a, b):\n    # Your code here\n    '),

('Return String Length', 'Complete the function to return the length of the given string.', 'easy',
'[{"input": {"s": "hello"}, "expected_output": 5}, {"input": {"s": "python"}, "expected_output": 6}]'::jsonb,
'def string_length(s):\n    # Your code here\n    '),

('Is Even', 'Complete the function to return True if the number is even, False otherwise.', 'easy',
'[{"input": {"n": 4}, "expected_output": true}, {"input": {"n": 7}, "expected_output": false}]'::jsonb,
'def is_even(n):\n    # Your code here\n    '),

('First and Last', 'Complete the function to return the first and last characters of a string concatenated.', 'easy',
'[{"input": {"s": "hello"}, "expected_output": "ho"}, {"input": {"s": "python"}, "expected_output": "pn"}]'::jsonb,
'def first_and_last(s):\n    # Your code here\n    '),

('Repeat String', 'Complete the function to return the string repeated n times.', 'easy',
'[{"input": {"s": "Hi", "n": 3}, "expected_output": "HiHiHi"}, {"input": {"s": "Go", "n": 2}, "expected_output": "GoGo"}]'::jsonb,
'def repeat_string(s, n):\n    # Your code here\n    '),

('Convert to Uppercase', 'Complete the function to return the string in uppercase.', 'easy',
'[{"input": {"s": "hello"}, "expected_output": "HELLO"}, {"input": {"s": "world"}, "expected_output": "WORLD"}]'::jsonb,
'def to_uppercase(s):\n    # Your code here\n    '),

('Count to N', 'Complete the function to return numbers from 1 to n, each on a new line.', 'easy',
'[{"input": {"n": 3}, "expected_output": "1\n2\n3"}, {"input": {"n": 5}, "expected_output": "1\n2\n3\n4\n5"}]'::jsonb,
'def count_to_n(n):\n    # Your code here\n    '),

('Absolute Value', 'Complete the function to return the absolute value of a number.', 'easy',
'[{"input": {"n": -5}, "expected_output": 5}, {"input": {"n": 3}, "expected_output": 3}]'::jsonb,
'def absolute(n):\n    # Your code here\n    '),

-- More Medium Problems
('Reverse String', 'Complete the function to return the reversed string.', 'medium',
'[{"input": {"s": "hello"}, "expected_output": "olleh"}, {"input": {"s": "python"}, "expected_output": "nohtyp"}]'::jsonb,
'def reverse_string(s):\n    # Your code here\n    '),

('Find Minimum', 'Complete the function that returns the smallest integer in a list.', 'medium',
'[{"input": {"lst": [3, 7, 2]}, "expected_output": 2}, {"input": {"lst": [10, 5, 15, 3]}, "expected_output": 3}]'::jsonb,
'def find_min(lst):\n    # Your code here\n    '),

('Count Occurrences', 'Complete the function that counts how many times a character appears in a string.', 'medium',
'[{"input": {"s": "hello", "char": "l"}, "expected_output": 2}, {"input": {"s": "python", "char": "o"}, "expected_output": 1}]'::jsonb,
'def count_char(s, char):\n    # Your code here\n    '),

('Remove Duplicates', 'Complete the function that returns a list with duplicates removed, maintaining order.', 'medium',
'[{"input": {"lst": [1, 2, 2, 3, 1]}, "expected_output": [1, 2, 3]}, {"input": {"lst": [4, 4, 4]}, "expected_output": [4]}]'::jsonb,
'def remove_duplicates(lst):\n    # Your code here\n    '),

('Sum of Digits', 'Complete the function that returns the sum of all digits in a positive integer.', 'medium',
'[{"input": {"n": 123}, "expected_output": 6}, {"input": {"n": 9876}, "expected_output": 30}]'::jsonb,
'def sum_digits(n):\n    # Your code here\n    '),

('Filter Even Numbers', 'Complete the function that returns only the even numbers from a list.', 'medium',
'[{"input": {"lst": [1, 2, 3, 4, 5]}, "expected_output": [2, 4]}, {"input": {"lst": [7, 8, 9, 10]}, "expected_output": [8, 10]}]'::jsonb,
'def filter_evens(lst):\n    # Your code here\n    '),

('Factorial', 'Complete the function that returns the factorial of n (n!).', 'medium',
'[{"input": {"n": 5}, "expected_output": 120}, {"input": {"n": 3}, "expected_output": 6}, {"input": {"n": 0}, "expected_output": 1}]'::jsonb,
'def factorial(n):\n    # Your code here\n    '),

('Is Prime', 'Complete the function that returns True if the number is prime, False otherwise.', 'medium',
'[{"input": {"n": 7}, "expected_output": true}, {"input": {"n": 4}, "expected_output": false}, {"input": {"n": 13}, "expected_output": true}]'::jsonb,
'def is_prime(n):\n    # Your code here\n    '),

('Average of List', 'Complete the function that returns the average of numbers in a list (rounded to 2 decimal places).', 'medium',
'[{"input": {"lst": [1, 2, 3, 4, 5]}, "expected_output": 3.0}, {"input": {"lst": [10, 20, 30]}, "expected_output": 20.0}]'::jsonb,
'def average(lst):\n    # Your code here\n    '),

('Word Count', 'Complete the function that returns the number of words in a string.', 'medium',
'[{"input": {"s": "Hello world"}, "expected_output": 2}, {"input": {"s": "Python is awesome"}, "expected_output": 3}]'::jsonb,
'def word_count(s):\n    # Your code here\n    '),

-- More Hard Problems
('Valid Parentheses', 'Given a string containing just parentheses, determine if the input string is valid. Valid means all brackets are closed in the correct order.', 'hard',
'[{"input": {"s": "()"}, "expected_output": true}, {"input": {"s": "()[]{}"}, "expected_output": true}, {"input": {"s": "(]"}, "expected_output": false}, {"input": {"s": "([)]"}, "expected_output": false}]'::jsonb,
'def is_valid(s):\n    # Your code here\n    '),

('Roman to Integer', 'Convert a Roman numeral to an integer. Input is guaranteed to be within the range from 1 to 3999.', 'hard',
'[{"input": {"s": "III"}, "expected_output": 3}, {"input": {"s": "IV"}, "expected_output": 4}, {"input": {"s": "IX"}, "expected_output": 9}, {"input": {"s": "LVIII"}, "expected_output": 58}]'::jsonb,
'def roman_to_int(s):\n    # Your code here\n    '),

('Merge Sorted Lists', 'Merge two sorted lists into one sorted list.', 'hard',
'[{"input": {"list1": [1, 3, 5], "list2": [2, 4, 6]}, "expected_output": [1, 2, 3, 4, 5, 6]}, {"input": {"list1": [1, 2], "list2": [3, 4]}, "expected_output": [1, 2, 3, 4]}]'::jsonb,
'def merge_sorted(list1, list2):\n    # Your code here\n    '),

('Find Missing Number', 'Given an array containing n distinct numbers from 0 to n, find the missing number.', 'hard',
'[{"input": {"nums": [3, 0, 1]}, "expected_output": 2}, {"input": {"nums": [0, 1]}, "expected_output": 2}, {"input": {"nums": [9,6,4,2,3,5,7,0,1]}, "expected_output": 8}]'::jsonb,
'def missing_number(nums):\n    # Your code here\n    '),

('Contains Duplicate', 'Return true if any value appears at least twice in the array, false if every element is distinct.', 'hard',
'[{"input": {"nums": [1, 2, 3, 1]}, "expected_output": true}, {"input": {"nums": [1, 2, 3, 4]}, "expected_output": false}, {"input": {"nums": [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]}, "expected_output": true}]'::jsonb,
'def contains_duplicate(nums):\n    # Your code here\n    '),

('Move Zeroes', 'Move all 0s to the end of the array while maintaining the relative order of non-zero elements.', 'hard',
'[{"input": {"nums": [0, 1, 0, 3, 12]}, "expected_output": [1, 3, 12, 0, 0]}, {"input": {"nums": [0, 0, 1]}, "expected_output": [1, 0, 0]}]'::jsonb,
'def move_zeroes(nums):\n    # Your code here\n    '),

('Single Number', 'Given a non-empty array where every element appears twice except for one, find that single one.', 'hard',
'[{"input": {"nums": [2, 2, 1]}, "expected_output": 1}, {"input": {"nums": [4, 1, 2, 1, 2]}, "expected_output": 4}, {"input": {"nums": [1]}, "expected_output": 1}]'::jsonb,
'def single_number(nums):\n    # Your code here\n    '),

('Majority Element', 'Find the element that appears more than n/2 times in an array of size n.', 'hard',
'[{"input": {"nums": [3, 2, 3]}, "expected_output": 3}, {"input": {"nums": [2, 2, 1, 1, 1, 2, 2]}, "expected_output": 2}]'::jsonb,
'def majority_element(nums):\n    # Your code here\n    '),

('Plus One', 'Given an array representing an integer, add one to the integer.', 'hard',
'[{"input": {"digits": [1, 2, 3]}, "expected_output": [1, 2, 4]}, {"input": {"digits": [4, 3, 2, 1]}, "expected_output": [4, 3, 2, 2]}, {"input": {"digits": [9, 9]}, "expected_output": [1, 0, 0]}]'::jsonb,
'def plus_one(digits):\n    # Your code here\n    '),

('Happy Number', 'A happy number is defined by: Starting with any positive integer, replace the number by the sum of the squares of its digits. Repeat until the number equals 1 or loops endlessly. Return true if n is a happy number.', 'hard',
'[{"input": {"n": 19}, "expected_output": true}, {"input": {"n": 2}, "expected_output": false}, {"input": {"n": 7}, "expected_output": true}]'::jsonb,
'def is_happy(n):\n    # Your code here\n    ');
