import os
from dotenv import load_dotenv
import mysql.connector

load_dotenv()

def get_connection():
    return mysql.connector.connect(
        host = os.getenv("DB_HOST"),
        port = int(os.getenv("DB_PORT", "3306")),
        user = os.getenv("DB_USER"),
        password = os.getenv("DB_PASSWORD"),
        database = os.getenv("DB_NAME"),
        autocommit = True
    )

def query(sql, params=(), fetchall = True):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(sql, params)
    result = cursor.fetchall() if fetchall else cursor.fetchone()
    cursor.close()
    conn.close()
    return result

def execute(sql, params=()):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)
    last_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return last_id