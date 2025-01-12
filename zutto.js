import "https://unpkg.com/vis-network/standalone/umd/vis-network.min.js";
import "./alert-dialog.js";

class Zutto {
  constructor(container) {
    this.container = container;
    this.network = null;
    this.nodes = new vis.DataSet();
    this.edges = new vis.DataSet();
  }

  get journalName() {
    return document.getElementById("journalName").textContent;
  }

  loadJournal() {
    const data = localStorage.getItem(this.journalName);
    if (data) {
      const journal = JSON.parse(data);
      this.nodes.clear();
      this.edges.clear();
      this.nodes.add(this.cleanNodes(journal.nodes));
      this.edges.add(this.cleanEdges(journal.edges));
    }
  }

  cleanNodes(nodes) {
    return nodes.map((node) => {
      return {
        label: node.label,
        id: node.id,
        group: node.group,
      };
    });
  }

  cleanEdges(edges) {
    return edges.map((edge) => {
      return {
        from: edge.from,
        to: edge.to,
        label: edge.label,
        id: edge.id,
      };
    });
  }

  saveJournal() {
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
    }

    callback(data);
    this.saveJournal();
  }

  async handleEdge(data, callback) {
    const label = await prompt("Enter edge label:", data.label || "");

    if (label !== null) {
      data.label = label;
      callback(data);
      this.saveJournal();
    } else if (await confirm("Would you like to swap the edge direction?")) {
      [data.from, data.to] = [data.to, data.from];
      callback(data);
      this.saveJournal();
    } else {
      callback(null);
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

    this.saveToJournal(targetJournalName, selectedData);
  }

  saveToJournal(journalName, data) {
    console.log(`Saving to journal: ${journalName}`, data);
  }
}

const zutto = new Zutto(document.getElementById("container"));
zutto.init();
