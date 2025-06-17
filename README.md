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

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).  
See [LICENSE](./LICENSE) for details, or visit [https://www.gnu.org/licenses/agpl-3.0.html](https://www.gnu.org/licenses/agpl-3.0.html).

## Contributing

Contributions are welcome! If you’d like to contribute to this project, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes with clear messages.
4. Push to your fork and open a pull request.

For larger changes or feature suggestions, please open an issue first to discuss your proposal.

Make sure to run tests (`npm run test`) before submitting a PR.
