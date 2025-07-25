CREATE TABLE users (
    username VARCHAR(20) UNIQUE,
    password BYTEA,
    salt BYTEA
);