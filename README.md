# Workload Calculator

This is a simple calculator with the purpose of estimating total operations/sec required for a given workload.
The output of this then provide costs estimates for the workload. Currently this supports DynamoDB cost estimates
with future plans to include databases such as ScyllaDB and others.

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

## Tests

To run tests locally:

```bash
npm run test
```
