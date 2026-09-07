[← Back to README](../README.md)

# Scalability & Performance Report: Handling 10,000+ Documents
*A technical analysis of indexing speed, memory management, and data efficiency with a 42GB research corpus.*

---

### 📢 Status: Next-Gen Engine Preview
The benchmarks presented below are powered by our **newly optimized indexing engine**. This update delivers a massive leap in scalability and resource efficiency. 
> [!NOTE]
> This engine is currently in the final stage of internal testing and has not yet been rolled out to the stable version. It will be **officially launched very soon**. Stay tuned for the update!

---

## 💻 Test Environment
*   **Device:** MacBook Pro (Intel Core i9)
*   **OS:** macOS 14.3.1
*   **Data Source:** 10,000 Academic PDFs downloaded from arXiv (Standard research papers)
*   **Average Length:** 17 pages per document
*   **Total Raw Data:** ~42.0 GB

## 📊 Performance Metrics

The following data tracks how PapersGPT scales from a small personal collection to an institutional-grade library of 10,000 documents.

| N (PDFs) | Raw PDF Size | Total Pages | Indexing Time | Index Size (Disk) | RSS Memory (Active) | RSS (Reload) | Avg. Retrieval |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 500 | 2.1 GB | 8,695 | 25.7s | 51 MB | 256 MB | 203 MB | 12.8 ms |
| 1,000 | 4.2 GB | 17,005 | 51.5s | 100 MB | 413 MB | 353 MB | 13.1 ms |
| 2,000 | 8.4 GB | 33,904 | 92.6s | 196 MB | 717 MB | 650 MB | 12.8 ms |
| 4,000 | 16.8 GB | 67,571 | 159s | 385 MB | 1.29 GB | 1.19 GB | 15.1 ms |
| 6,000 | 25.2 GB | 101,914 | 251s | 562 MB | 2.10 GB | 1.66 GB | 15.1 ms |
| 8,000 | 33.6 GB | 136,748 | 339s | 735 MB | 2.83 GB | 1.88 GB* | 18.7 ms |
| **10,000** | **42.0 GB** | **169,681** | **421s** | **901 MB** | **3.51 GB** | **2.21 GB*** | **19.5 ms** |

*\*Note: Automatic Memory Offloading (offload) is triggered for large-scale libraries to maintain system performance.*

---

## 💾 Data Efficiency & Footprint

### 1. High Compression Ratio (46:1)
Our next-gen engine effectively compresses the searchable semantic data of a **42.0 GB** library into a compact **901 MB** index. You can manage massive knowledge bases without worrying about disk space.

### 2. Zero Storage Bloat
While other RAG solutions often double your storage requirements, PapersGPT adds less than **2.5% overhead** to your existing Zotero library's disk footprint.

### 3. Smart Memory Offloading
For libraries exceeding 6,000 documents, the new engine activates its proprietary **Memory Offloading** mechanism. By offloading non-critical segments while keeping "hot" indices in RAM, the process maintains a low resource footprint (~2.2GB for 10k docs) without sacrificing retrieval speed.

### 4. Instant Retrieval (O(log N))
Search performance remains lightning-fast even as data volume grows. Even with a **42GB corpus**, the average retrieval time is just **19.5ms**, making AI analysis feel instantaneous.

---

## 💡 Why this matters for Organizations

*   **Institutional Scalability:** Easily handle departmental or lab-wide shared Zotero libraries via WebDAV or Cloud Storage without synchronization bottlenecks.
*   **Workstation Friendly:** The ultra-low memory footprint after reloading ensures the PapersGPT agent can run 24/7 in the background without interfering with other resource-intensive research applications.
*   **NAS & Remote Support:** Optimized for low disk I/O, making it ideal for environments where PDFs are stored on Network Attached Storage.

---
[← Back to README](../README.md)
