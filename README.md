# CCS Mérida - Service solution
_CCS internal service with the purpose of identify and insert the missing register "Conectado"/"Desconectado" in the database._

## Required ⚙️

* Node v16.13.2
* npm v8.1.2
* MySQL v8.0.29

## Getting started 🔧

__Clone the repository__
```
git clone git@github.com:faustocortez/ccs-register-service.git
```

__Rename the file example.env to .env__

## Run the project 🚀

__Install dependencies__:
```
npm install
```

__Start server__:
```
npm run start
```

__Base local endpoint__:
```
// you can change the port in .env file
http://localhost:3010
```

## Usage 👨🏻‍💻

__HTTP__:
```js
# Endpoint
[POST] => http://localhost:3010/service/v1/registers

# Body
{
  date: "2022-06-24", // value for "fecha" in DB
}
```
__Curl__:
```js
curl --location --request POST 'http://localhost:3010/service/v1/registers' \
--header 'Content-Type: application/json' \
--data-raw '{
    "date": "2022-06-24"
}'
```



## Author ✒️

* **Fausto A. Cortez Cardoz** - *Software Developer*