# Contributing

This guide explains how to contribute to the Knowledge Graph plugin and outlines the standards for documentation and code changes.

---

## 1. Documentation Standards

Contributors must review the [Style Guide](docs/STYLE-GUIDE.md) before making changes to any documentation or knowledge graph entries. All contributions adhere strictly to these defined formats.

## 2. Branch Naming Conventions

All branches follow strict conventions. Contributors never create orphan work. Every branch and commit MUST link to a GitHub Issue:
- Example: `vX.Y.Z-feature-name-issue-N`
- Preservation: The project NEVER deletes feature branches; they serve as historical records.

## 3. Pull Request Template

When submitting a Pull Request, contributors use conventional commits: `feat(scope): desc Closes #N`. The process requires verifying that all tests and validations (like `branch-check` and `shadow-sync`) pass prior to submitting.

## 4. Local Testing

To test changes locally, contributors follow these steps:
1. Ensure the branch passes git governance validation.
2. Review local file linkages and formatting.
3. Validate plugin integrity if appropriate.

## 5. Code of Conduct

The project is released with a Contributor Code of Conduct. By participating in this project, contributors agree to abide by its terms.

## 6. Related Documentation

- [Style Guide](docs/STYLE-GUIDE.md) - Documentation and authoring standards.
- [Workflows](core/docs/WORKFLOWS.md) - Manual workflows for contributing.
