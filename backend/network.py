"""
network.py — NAMMA KSP
──────────────────────────
Criminal network analysis using NetworkX.
Builds offender-victim-FIR relationship graphs and computes
centrality metrics, community detection, and key node identification.
"""

import logging
import networkx as nx
from database import fetch_all

logger = logging.getLogger(__name__)


# ─── Graph Builder ────────────────────────────────────────────────────────────

async def build_criminal_network(
    district: str = None,
    crime_type: str = None,
    limit: int = 200
) -> nx.Graph:
    """
    Build a NetworkX graph from offender-victim-FIR relationships.

    Nodes:
      - Offenders  (type='offender', risk_category, previous_firs)
      - Victims    (type='victim')
      - FIRs       (type='fir', crime_type, status, date)

    Edges:
      - Offender → FIR  (relationship_type)
      - Victim   → FIR  (relationship_type)
    """
    conditions = []
    params = []

    if district:
        conditions.append("f.district = ?")
        params.append(district)
    if crime_type:
        conditions.append("f.crime_type = ?")
        params.append(crime_type)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    rows = await fetch_all(f"""
        SELECT
            r.offender_id, r.victim_id, r.fir_id, r.relationship_type,
            o.name AS offender_name, o.risk_category, o.previous_firs,
            v.name AS victim_name,
            f.crime_type, f.status, f.date, f.district
        FROM relationships r
        JOIN offenders o ON r.offender_id = o.offender_id
        JOIN victims   v ON r.victim_id   = v.victim_id
        JOIN firs      f ON r.fir_id      = f.fir_id
        {where}
        LIMIT ?
    """, tuple(params + [limit]))

    G = nx.Graph()

    for row in rows:
        oid = row["offender_id"]
        vid = row["victim_id"]
        fid = row["fir_id"]

        # Add offender node
        if not G.has_node(oid):
            G.add_node(oid,
                label=row["offender_name"],
                node_type="offender",
                risk_category=row["risk_category"],
                previous_firs=row["previous_firs"]
            )

        # Add victim node
        if not G.has_node(vid):
            G.add_node(vid,
                label=row["victim_name"],
                node_type="victim"
            )

        # Add FIR node
        if not G.has_node(fid):
            G.add_node(fid,
                label=fid,
                node_type="fir",
                crime_type=row["crime_type"],
                status=row["status"],
                date=row["date"],
                district=row["district"]
            )

        # Edges
        G.add_edge(oid, fid,
            relationship=row["relationship_type"],
            edge_type="offender_fir"
        )
        G.add_edge(vid, fid,
            relationship="victim_of",
            edge_type="victim_fir"
        )

    logger.info("Built criminal network: %d nodes, %d edges", G.number_of_nodes(), G.number_of_edges())
    return G


# ─── Graph → Cytoscape.js Format ─────────────────────────────────────────────

def graph_to_cytoscape(G: nx.Graph) -> dict:
    """
    Convert NetworkX graph to Cytoscape.js elements format.
    Returns { nodes: [...], edges: [...] }
    """
    RISK_COLOR = {
        "High":   "#c0392b",
        "Medium": "#e67e22",
        "Low":    "#27ae60",
    }
    TYPE_COLOR = {
        "offender": None,   # uses risk_category color
        "victim":   "#2980b9",
        "fir":      "#7f8c8d",
    }

    nodes = []
    for node_id, data in G.nodes(data=True):
        node_type = data.get("node_type", "fir")
        risk      = data.get("risk_category", "Low")

        if node_type == "offender":
            color = RISK_COLOR.get(risk, "#7f8c8d")
            size  = 30 + min(data.get("previous_firs", 0) * 2, 20)
        elif node_type == "victim":
            color = TYPE_COLOR["victim"]
            size  = 20
        else:
            color = TYPE_COLOR["fir"]
            size  = 15

        nodes.append({
            "data": {
                "id":          node_id,
                "label":       data.get("label", node_id),
                "node_type":   node_type,
                "color":       color,
                "size":        size,
                "risk":        risk,
                "crime_type":  data.get("crime_type", ""),
                "status":      data.get("status", ""),
                "date":        data.get("date", ""),
                "district":    data.get("district", ""),
            }
        })

    edges = []
    for u, v, data in G.edges(data=True):
        edges.append({
            "data": {
                "id":           f"{u}_{v}",
                "source":       u,
                "target":       v,
                "relationship": data.get("relationship", ""),
                "edge_type":    data.get("edge_type", ""),
            }
        })

    return {"nodes": nodes, "edges": edges}


# ─── Graph Metrics ────────────────────────────────────────────────────────────

def compute_network_metrics(G: nx.Graph) -> dict:
    """
    Compute key network analytics:
      - Degree centrality (most connected nodes)
      - Betweenness centrality (bridge nodes)
      - Connected components
      - Key offenders (high-degree offender nodes)
    """
    if G.number_of_nodes() == 0:
        return {"error": "Empty graph"}

    degree_cent     = nx.degree_centrality(G)
    betweenness     = nx.betweenness_centrality(G, k=min(100, G.number_of_nodes()))
    components      = list(nx.connected_components(G))

    # Top 10 most central nodes
    top_degree = sorted(degree_cent.items(), key=lambda x: x[1], reverse=True)[:10]
    top_between = sorted(betweenness.items(), key=lambda x: x[1], reverse=True)[:10]

    # Key offenders — offender nodes with highest degree
    offender_nodes = [
        (n, d) for n, d in G.nodes(data=True) if d.get("node_type") == "offender"
    ]
    key_offenders = sorted(
        offender_nodes,
        key=lambda x: degree_cent.get(x[0], 0),
        reverse=True
    )[:10]

    return {
        "total_nodes":       G.number_of_nodes(),
        "total_edges":       G.number_of_edges(),
        "connected_components": len(components),
        "largest_component": max(len(c) for c in components) if components else 0,
        "avg_degree":        round(sum(dict(G.degree()).values()) / max(G.number_of_nodes(), 1), 2),
        "top_degree_nodes":  [
            {
                "id":    nid,
                "label": G.nodes[nid].get("label", nid),
                "type":  G.nodes[nid].get("node_type", ""),
                "score": round(score, 4)
            }
            for nid, score in top_degree
        ],
        "top_betweenness_nodes": [
            {
                "id":    nid,
                "label": G.nodes[nid].get("label", nid),
                "type":  G.nodes[nid].get("node_type", ""),
                "score": round(score, 4)
            }
            for nid, score in top_between
        ],
        "key_offenders": [
            {
                "id":            nid,
                "label":         data.get("label", nid),
                "risk_category": data.get("risk_category", ""),
                "previous_firs": data.get("previous_firs", 0),
                "degree_score":  round(degree_cent.get(nid, 0), 4)
            }
            for nid, data in key_offenders
        ]
    }


# ─── Shared Offender Network ──────────────────────────────────────────────────

async def get_shared_offender_network(offender_id: str) -> dict:
    """
    Build a focused sub-network around a specific offender:
    their victims, FIRs, and co-offenders (offenders sharing a victim).
    """
    rows = await fetch_all("""
        SELECT
            r.offender_id, r.victim_id, r.fir_id, r.relationship_type,
            o.name AS offender_name, o.risk_category, o.previous_firs,
            v.name AS victim_name,
            f.crime_type, f.status, f.date, f.district
        FROM relationships r
        JOIN offenders o ON r.offender_id = o.offender_id
        JOIN victims   v ON r.victim_id   = v.victim_id
        JOIN firs      f ON r.fir_id      = f.fir_id
        WHERE r.offender_id = ?
           OR r.victim_id IN (
               SELECT victim_id FROM relationships WHERE offender_id = ?
           )
        LIMIT 150
    """, (offender_id, offender_id))

    G = nx.Graph()
    for row in rows:
        oid = row["offender_id"]
        vid = row["victim_id"]
        fid = row["fir_id"]

        if not G.has_node(oid):
            G.add_node(oid, label=row["offender_name"], node_type="offender",
                       risk_category=row["risk_category"], previous_firs=row["previous_firs"])
        if not G.has_node(vid):
            G.add_node(vid, label=row["victim_name"], node_type="victim")
        if not G.has_node(fid):
            G.add_node(fid, label=fid, node_type="fir",
                       crime_type=row["crime_type"], status=row["status"],
                       date=row["date"], district=row["district"])

        G.add_edge(oid, fid, relationship=row["relationship_type"], edge_type="offender_fir")
        G.add_edge(vid, fid, relationship="victim_of", edge_type="victim_fir")

    return {
        "graph":   graph_to_cytoscape(G),
        "metrics": compute_network_metrics(G)
    }


# ─── Full Network API Response ────────────────────────────────────────────────

async def get_network_data(
    district: str = None,
    crime_type: str = None,
    limit: int = 200
) -> dict:
    """Main entry point — build graph and return cytoscape + metrics."""
    G = await build_criminal_network(district=district, crime_type=crime_type, limit=limit)
    return {
        "graph":   graph_to_cytoscape(G),
        "metrics": compute_network_metrics(G)
    }
