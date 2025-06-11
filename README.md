# DynamoDB Workload Calculator

This is a simple DynamoDB calculator with the purpose of estimating total operations/sec required for a given workload.
The output of this then provide costs estimates for the workload.

This calculator can be seen live at: https://calculator.scylladb.com

## Prerequisites

To build the site you will need NPM and vite installed. 

```bash
npm install -g vite
```

## Running the site

To run the site locally:

```bash
npm run dev
```

## Deploying the site

This site is deployed using GitHub Actions. The workflow is defined in `.github/workflows/static.yml`.  

# Essential Links

- https://aws.amazon.com/dynamodb/pricing/
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/global-tables-billing.html
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/dax-cluster-sizing.html#dax-sizing-dataset-size
