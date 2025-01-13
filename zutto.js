import "https://unpkg.com/vis-network/standalone/umd/vis-network.min.js";
import "./alert-dialog.js";

class Zutto {
  constructor(container) {
    this.container = container;
    this.network = null;
    this.nodes = new vis.DataSet();
    this.edges = new vis.DataSet();
    this.journalNameElement = document.getElementById("journalName");
    this.journalName = "ichiji";
  }

  get journalName() {
    return this.journalNameElement.textContent;
  }

  set journalName(name) {
    name = name.trim();
    this.journalNameElement.textContent = name;
  }

  loadJournal() {
    const data = localStorage.getItem(this.journalName);
    if (data) {
      try {
        const journal = JSON.parse(data);
        this.nodes = new vis.DataSet(journal.nodes.map(this.cleanNode));
        this.edges = new vis.DataSet(journal.edges.map(this.cleanEdge));
      } catch (e) {
        console.error(`Corrupted journal data for "${this.journalName}":`);
        console.log(data);
        alert(
          `Failed to load journal "${this.journalName}". The data may be corrupted. Check the console for the raw data.`
        );
        // Reset to empty datasets if parse fails
        this.nodes = new vis.DataSet();
        this.edges = new vis.DataSet();
      }
    }
  }

  cleanNode(node) {
    return {
      label: node.label.trim(),
      id: node.id,
      group: node.group.trim(),
    };
  }

  cleanEdge(edge) {
    return {
      from: edge.from,
      to: edge.to,
      label: edge.label.trim(),
      id: edge.id,
    };
  }

  saveJournal() {
    if (this.nodes.length === 0 && this.edges.length === 0) {
      localStorage.removeItem(this.journalName);
      return;
    }

    localStorage.setItem(
      this.journalName,
      JSON.stringify({
        nodes: this.nodes.get(),
        edges: this.edges.get(),
      })
    );
  }

  async init() {
    this.loadJournal();
    this.renderJournal();
    document
      .getElementById("journalName")
      .addEventListener("click", async (e) => {
        e.preventDefault();
        await this.changeJournal();
      });

    document
      .getElementById("swapEdgesButton")
      .addEventListener("click", () => this.swapSelectedEdges());

    document
      .getElementById("copySelectionButton")
      .addEventListener("click", () => this.copySelectionToAnotherJournal());
  }

  async changeJournal() {
    const newJournalName = await prompt("Enter new journal name:", "");
    if (newJournalName) {
      this.saveJournal();
      this.journalName = newJournalName;
      this.loadJournal();
      this.renderJournal();
    }
  }

  get networkOptions() {
    return {
      manipulation: {
        enabled: true,
        addNode: this.handleNode.bind(this),
        editNode: this.handleNode.bind(this),
        deleteNode: this.handleDelete.bind(this),
        addEdge: this.handleEdge.bind(this),
        editEdge: this.handleEdge.bind(this),
        deleteEdge: this.handleDelete.bind(this),
        initiallyActive: true,
      },
      interaction: {
        multiselect: true,
      },
      edges: {
        dashes: true,
        arrows: {
          middle: {
            enabled: true,
            type: "arrow",
          },
        },
      },
      configure: {
        enabled: true,
      },
    };
  }

  renderJournal() {
    document.getElementById("journalName").textContent = this.journalName;
    this.network = new vis.Network(
      this.container,
      {
        nodes: this.nodes,
        edges: this.edges,
      },
      this.networkOptions
    );
  }

  async handleNode(data, callback) {
    const label = await prompt("Enter node label:", data.label || "");

    if (label !== null) {
      const group = await prompt("Enter node group:", data.group || "");
      data.label = label;
      data.group = group;
      callback(this.cleanNode(data));
      this.saveJournal();
    }
  }

  async handleEdge(data, callback) {
    const label = await prompt("Enter edge label:", data.label || "");

    if (label !== null) {
      data.label = label;
      callback(this.cleanEdge(data));
      this.saveJournal();
    }
  }

  async handleDelete(data, callback) {
    if (await confirm("Are you sure you want to delete this item?")) {
      callback(data);
      this.saveJournal();
    } else {
      callback(null);
    }
  }

  swapSelectedEdges() {
    const selectedEdges = this.network.getSelectedEdges();
    selectedEdges.forEach((edgeId) => {
      const edge = this.edges.get(edgeId);
      if (edge) {
        [edge.from, edge.to] = [edge.to, edge.from];
        this.edges.update(edge);
      }
    });
    this.saveJournal();
  }

  async copySelectionToAnotherJournal() {
    const selectedNodes = this.network.getSelectedNodes();
    const selectedEdges = this.network.getSelectedEdges();

    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      alert("No nodes or edges selected.");
      return;
    }

    const targetJournalName = await prompt("Enter the target journal name:");
    if (!targetJournalName) {
      return;
    }

    const selectedData = {
      nodes: this.nodes.get(selectedNodes),
      edges: this.edges.get(selectedEdges),
    };

    this.saveJournal();
    this.journalName = targetJournalName;
    this.loadJournal();
    this.nodes.add(selectedData.nodes);
    this.edges.add(selectedData.edges);
    this.saveJournal();
    this.renderJournal();
  }
}

const zutto = new Zutto(document.getElementById("container"));
zutto.init();
