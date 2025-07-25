CREATE TABLE users (
    login VARCHAR(20) UNIQUE,
    password BYTEA,
    salt BYTEA
);