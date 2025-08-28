# database connection management
# query helpers and utilities
import psycopg2
from psycopg2 import pool
import os

_connection_pool = None

def init_db():
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            host=os.getenv('DB_HOST', 'db'),
            port=os.getenv('DB_PORT', 5432),
            database=os.getenv('DB_NAME', 'postgres'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password')
        )

def get_db_connection():
    if _connection_pool is None:
        init_db()  # Auto-initialize if not done
    return _connection_pool.getconn()
    
def return_db_connection(conn):
    if _connection_pool:
        _connection_pool.putconn(conn)