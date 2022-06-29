export const ormConfig = {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "root",
    "database": "calls",
    "entities": ["src/entities/**/*.ts"],
    "synchronize": true
};
 