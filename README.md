# PFMG Function

A production-ready Spring Boot function template for Azure Functions, configured with Azure best practices for Key Vault, Blob Storage, and SQL Database integration.

## 🚀 Features

- **Azure Integration**
  - ✅ Azure Key Vault for secrets management with auto-refresh
  - ✅ Azure Blob Storage with Managed Identity authentication
  - ✅ Azure SQL Database with HikariCP connection pooling
  - ✅ Retry logic for transient Azure failures
  - ✅ Health indicators for all Azure services

- **Production Ready**
  - ✅ Environment-specific configurations (local, dev, cer, prd)
  - ✅ Spring Boot Actuator with health probes
  - ✅ Connection leak detection and monitoring
  - ✅ Comprehensive logging and error handling
  - ✅ Spring Security integration

- **Developer Experience**
  - ✅ Local development support with Service Principal
  - ✅ VS Code launch configurations
  - ✅ Hot reload with Spring DevTools
  - ✅ Structured logging

## 📋 Prerequisites

- **Java 21** or higher
- **Maven 3.8+**
- **Azure CLI** (for local development)
- **Azure Subscription** with:
  - Azure Key Vault
  - Azure SQL Database
  - Azure Storage Account
  - Service Principal or Managed Identity

## 🛠️ Local Development Setup

### 1. Install Azure CLI

```bash
# Windows
winget install Microsoft.AzureCLI

# macOS
brew install azure-cli

# Login
az login
```

### 2. Create Service Principal for Local Development

```bash
# Create service principal
az ad sp create-for-rbac --name pfmg-backend-local --role Contributor

# Output will include:
# - appId (AZURE_CLIENT_ID)
# - password (AZURE_CLIENT_SECRET)
# - tenant (AZURE_TENANT_ID)
```

### 3. Grant Service Principal Access to Azure Resources

```bash
# Key Vault
az keyvault set-policy --name your-keyvault-name \
  --spn <AZURE_CLIENT_ID> \
  --secret-permissions get list

# Storage Account (assign "Storage Blob Data Contributor" role)
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee <AZURE_CLIENT_ID> \
  --scope /subscriptions/<subscription-id>/resourceGroups/<rg-name>/providers/Microsoft.Storage/storageAccounts/<storage-account-name>

# SQL Database (add as Azure AD admin or SQL user)
```

### 4. Configure Environment Variables

Copy `.env.template` to `.env` and fill in your values:

```bash
cp .env.template .env
```

Edit `.env`:
```properties
AZURE_CLIENT_ID=your-app-id-here
AZURE_CLIENT_SECRET=your-password-here
AZURE_TENANT_ID=your-tenant-id-here
KEY_VAULT_URL=https://your-keyvault.vault.azure.net/
```

### 5. Add Secrets to Azure Key Vault

```bash
# Azure SQL Database
az keyvault secret set --vault-name your-keyvault --name azure-sql-server-fqdn --value "yourserver.database.windows.net"
az keyvault secret set --vault-name your-keyvault --name azure-sql-database-name --value "yourdatabase"
az keyvault secret set --vault-name your-keyvault --name azure-sql-admin-user --value "sqladmin"
az keyvault secret set --vault-name your-keyvault --name azure-sql-admin-password --value "YourSecurePassword123!"

# Azure Blob Storage
az keyvault secret set --vault-name your-keyvault --name azure-blob-container-name --value "files"
az keyvault secret set --vault-name your-keyvault --name azure-blob-account-name --value "yourstorageaccount"
az keyvault secret set --vault-name your-keyvault --name azure-blob-endpoint --value "https://yourstorageaccount.blob.core.windows.net"
```

### 6. Run the Application

```bash
# Using Maven
mvn spring-boot:run

# Or using VS Code
# Press F5 and select "Local Development"
```

The application will start on `http://localhost:8080`

## 🏗️ Project Structure

```
src/
├── main/
│   ├── java/com/fsapps/
│   │   └── Application.java
│   └── resources/
│       └── application.yml
└── test/
```

## Project ID

This project uses the identifier: **pfmg**
