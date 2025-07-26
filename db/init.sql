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
    duration_seconds INTEGER,
    played_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);