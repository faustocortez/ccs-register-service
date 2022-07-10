# CCS Mérida - Service solution
_CCS internal service with the purpose of identify and insert the missing register "Conectado"/"Desconectado" in the database._

## Required ⚙️

* Node v16.13.2
* npm v8.1.2
* MySQL v8.0.29

## Getting started 🔧

__Clone the repository__:
```
git clone git@github.com:faustocortez/ccs-register-service.git
```
<sub><sup>or [download a ZIP file](https://github.com/faustocortez/ccs-register-service/archive/refs/heads/develop.zip) of the project</sup></sub>


__Rename the file .env.example to .env__:
```
/* 
  Change the name of .env.example to .env
  and fill the required variables
*/
```

## Run the project 🚀

__Go to the root of the project directory__:
```
// Assuming that you are at the folder where the project was downloaded
cd /css-register-service
```

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
// Endpoint
[POST] => http://localhost:3010/service/v1/registers

// Body
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