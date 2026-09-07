[← Back to README](../README.md)

# Scalability & Performance Report: Handling 10,000+ Documents
*A technical analysis of indexing speed, memory management, and data efficiency with a 42GB research corpus.*

## 💻 Test Environment
*   **Device:** MacBook Pro (Intel Core i9)
*   **OS:** macOS 14.3.1
*   **Data Source:** 10,000 Academic PDFs downloaded from arXiv(Average 17 pages per document)
*   **Total Raw Data:** ~42.0 GB

## 📊 Performance Metrics

The following data tracks how PapersGPT scales from a small personal collection to an institutional-grade library of 10,000 documents.

| N (PDFs) | Raw PDF Size | Total Pages | Indexing Time | Index Size (Disk) | RSS Memory (Active) | Avg. Retrieval |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 500 | 2.1 GB | 8,695 | 25.7s | 51 MB | 256 MB | 12.8 ms |
| 1,000 | 4.2 GB | 17,005 | 51.5s | 100 MB | 413 MB | 13.1 ms |
| 2,000 | 8.4 GB | 33,904 | 92.6s | 196 MB | 717 MB | 12.8 ms |
| 4,000 | 16.8 GB | 67,571 | 159s | 385 MB | 1.29 GB | 15.1 ms |
| 6,000 | 25.2 GB | 101,914 | 251s | 562 MB | 2.10 GB | 15.1 ms |
| 8,000 | 33.6 GB | 136,748 | 339s | 735 MB | 1.88 GB* | 18.7 ms |
| **10,000** | **42.0 GB** | **169,681** | **421s** | **901 MB** | **2.21 GB*** | **19.5 ms** |

*\*Note: Automatic Memory Offloading triggered to maintain system stability.*

---

## 💾 Data Efficiency & Footprint

### 1. High Compression Ratio
Our indexing engine effectively compresses the searchable semantic data of a **42.0 GB** library into a compact **901 MB** high-performance index. This represents a **46:1 reduction** in size, ensuring your storage remains uncluttered.

### 2. Zero Storage Bloat
Unlike many RAG (Retrieval-Augmented Generation) solutions that can double your storage requirements, PapersGPT adds less than **2.5% overhead** to your existing library's disk footprint.

### 3. Smart Memory Management
For large-scale libraries (>6,000 docs), PapersGPT utilizes a proprietary **Memory Offloading** mechanism. By offloading non-critical segments to disk while keeping hot indices in RAM, the agent maintains a low resource footprint (~2.2GB for 10k docs) without sacrificing retrieval speed.

### 4. Instant Retrieval (O(log N))
Search performance scales logarithmically. Even when querying a **42GB corpus**, the average retrieval time is just **19.5ms**. To the researcher, finding context across 10,000 papers feels instantaneous.

---

## 💡 Why this matters for Organizations

*   **Institutional Scalability:** Easily manage departmental or lab-wide shared Zotero libraries via WebDAV or Cloud Storage without synchronization bottlenecks.
*   **NAS Friendly:** Low disk I/O and small index files make it ideal for research environments using Network Attached Storage.
*   **Background Efficiency:** Low memory consumption ensures that the PapersGPT agent can run 24/7 in the background without interfering with other intensive research applications.
