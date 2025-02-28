# TaxService
### A Tax Service that allows the user to query their tax position as well as:
- Ingest sale events and tax payments
- Amend sale items
### To get started with this service:
- Clone this repository
- Run `npm install` to install dependencies
- Run `npm run dev` to start the server
- A SQLite database will be intialized with the schema on the first run or if the database file does not exist

This service is currently only suitable for use in a local environment and is configured to run on port 3000 with endpoints available at `http://localhost:3000`

### Endpoint Usage:
You can use your preferred method of sending HTTP requests to the service such as by curl request or a client library e.g. Postman.  
The results of your requests can be seen through logs in your terminal. 

### Endpoints:

### Sale Event:
Method: POST  
Request path: /transactions  
Request body:
```json
{
  "eventType": "SALES",
  "date": "string - Date and time ISO 8601",
  "invoiceId": "string",
  "items": [
    {
      "itemId": "string",
      "cost": "number - amount in pennies",
      "taxRate": "number"
    }
  ]
}
```

### Tax Payment:
Method: POST  
Request path: /transactions  
Request body:
```json
{
  "eventType": "TAX_PAYMENT",
  "date": "string - Date and time ISO 8601",
  "amount": "number - amount in pennies"
}
```

### Amendment:
Method: PATCH  
Request path: /sale  
Request body:
```json
{
  "date": "Date and time ISO 8601",
  "invoiceId": "string",
  "itemId": "string",
  "cost": "number - amount in pennies",
  "taxRate": "number"
}
```

### Tax Position:
Method: GET  
Request path: /tax-position  
Request query parameters:  
&nbsp;&nbsp;&nbsp;&nbsp; date: Date and time ISO 8601  
Example: `http://localhost:3000/tax-position?date=2024-02-22T17:29:39Z`

### Assumptions:
- Only the most recent amendment of a sale item will be considered as the user inputs both the cost and the tax rate of an item

  
