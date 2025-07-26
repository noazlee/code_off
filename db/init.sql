CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(20) UNIQUE NOT NULL,
    password BYTEA NOT NULL,
    salt BYTEA NOT NULL,
    created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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

-- Easy Problem
('Hello World', 'Complete the function to print "Hello World" to the console. Make sure the output matches exactly.', 'easy',
'[{"input": {}, "expected_output": "Hello World"}]'::jsonb,
'def main():\n    # Your code here\n    pass\n\nmain()'),

-- Medium Problem  
('Sum Array', 'Complete the function to return the sum of all numbers in a list. The function should take a list as input and return the total sum.', 'medium',
'[{"input": {"arr": [1,2,3,4,5]}, "expected_output": 15}, {"input": {"arr": [10,20,30]}, "expected_output": 60}, {"input": {"arr": [-1,1,0]}, "expected_output": 0}]'::jsonb,
'def sum_array(arr):\n    # Your code here\n    pass\n\nprint(sum_array([1,2,3,4,5]))'),

-- Hard Problem
('Fibonacci Sequence', 'Complete the function to return the nth Fibonacci number. The Fibonacci sequence starts with 0, 1, and each subsequent number is the sum of the previous two.', 'hard',
'[{"input": {"n": 0}, "expected_output": 0}, {"input": {"n": 1}, "expected_output": 1}, {"input": {"n": 5}, "expected_output": 5}, {"input": {"n": 10}, "expected_output": 55}]'::jsonb,
'def fibonacci(n):\n    # Your code here\n    pass\n\nprint(fibonacci(10))');