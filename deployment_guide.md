# 🚀 UPI Offline Mesh 2.0 - Manual Deployment Guide

This guide describes how to manually deploy the **UPI Offline Mesh 2.0** application. Choose the method that best fits your target environment (local server, cloud VM, VPS, or cloud platform).

---

## 🛠️ Prerequisites
Ensure your server or VM has the following installed:
* **Java 21** (e.g. Eclipse Temurin OpenJDK 21)
* **Maven** (optional, you can use the bundled `./mvnw` script)
* **Docker & Docker Compose** (required if deploying via containers)

---

## 📦 Method A: The Single-Process JAR Deployment (Easiest & Lightest)
This is the simplest way to deploy the application on a VPS, server, or cloud hosting platform. It packages both the backend APIs and the pre-built React frontend visualizer into a single **fat JAR** which you can run anywhere.

### How it works:
* The React client is pre-compiled and served directly from the Spring Boot static resources.
* The application automatically checks if PostgreSQL or Redis are running. If they are not found, it **seamlessly falls back to an in-memory H2 database** and **in-memory caching**, meaning it works instantly with zero configurations.

### Steps:
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Srujan4812/upi-offline-mesh.git
   cd upi-offline-mesh
   ```

2. **Build the JAR file:**
   On Windows (CMD/PowerShell):
   ```powershell
   .\mvnw.cmd clean package -DskipTests
   ```
   On Linux/macOS:
   ```bash
   chmod +x mvnw
   ./mvnw clean package -DskipTests
   ```

3. **Run the application:**
   ```bash
   java -jar target/upi-offline-mesh-0.0.1-SNAPSHOT.jar
   ```

4. **Access the application:**
   Open your browser and navigate to:
   ```
   http://localhost:8080
   ```
   *(If deploying on a remote VPS/VM, replace `localhost` with your server's public IP address).*

---

## 🐳 Method B: Multi-Container Orchestration (Docker Compose)
This deploys the complete enterprise stack, including external databases, caching servers, and the metrics dashboard.

### What gets deployed:
* **Spring Boot API Backend** (Port `8080`)
* **Nginx + React Frontend Client** (Port `80`)
* **PostgreSQL Database** (Port `5432`)
* **Redis Caching Server** (Port `6379`)
* **Prometheus metrics scraper** (Port `9090`)
* **Grafana analytics dashboard** (Port `3000`)

### Steps:
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Srujan4812/upi-offline-mesh.git
   cd upi-offline-mesh
   ```

2. **Spin up the Docker Compose cluster:**
   ```bash
   docker compose up -d --build
   ```

3. **Verify the services are running:**
   ```bash
   docker compose ps
   ```

4. **Service Mapping & URLs:**
   * 🌐 **React Visualizer Console:** `http://<your-server-ip>` (Port 80)
   * ⚙️ **Spring Boot REST Engine:** `http://<your-server-ip>:8080`
   * 📊 **Grafana Analytics:** `http://<your-server-ip>:3000` (Login: `admin` / `admin`)
   * 📈 **Prometheus Metrics:** `http://<your-server-ip>:9090`

---

## 🔒 Configuration (Optional)
If you run the standalone JAR (Method A) but want to connect it to an external PostgreSQL database or Redis cache instead of using the in-memory fallbacks, you can pass environment variables when starting the application:

```bash
java -jar -Dspring.profiles.active=prod \
          -Dspring.datasource.url=jdbc:postgresql://your-db-host:5432/dbname \
          -Dspring.datasource.username=your_username \
          -Dspring.datasource.password=your_password \
          -Dspring.data.redis.host=your_redis_host \
          -Dspring.data.redis.port=6379 \
          -Dspring.data.redis.password=your_redis_password \
          target/upi-offline-mesh-0.0.1-SNAPSHOT.jar
```
