from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from flask_cors import CORS
from datetime import datetime
from bson import ObjectId
import os

app = Flask(__name__)
CORS(app)

app.config["MONGO_URI"] = os.environ.get(
    "MONGO_URI", "mongodb://localhost:27017/logs"
)
mongo = PyMongo(app)


# ── Helpers ──────────────────────────────────────────────────────────────────

def serialize(log):
    """Convert MongoDB document to JSON-safe dict."""
    log["_id"] = str(log["_id"])
    return log


# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint — used by CI/CD and load balancers."""
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()}), 200


@app.route("/logs", methods=["POST"])
def add_log():
    """
    Receive a new log entry and store it in MongoDB.

    Expected JSON body:
        {
            "message": "User authenticated successfully",
            "type":    "INFO",        # INFO | WARN | ERROR
            "source":  "api-gateway"  # optional
        }
    """
    data = request.get_json(force=True)

    if not data or "message" not in data or "type" not in data:
        return jsonify({"error": "message and type are required"}), 400

    if data["type"] not in ("INFO", "WARN", "ERROR"):
        return jsonify({"error": "type must be INFO, WARN, or ERROR"}), 400

    log = {
        "message":   data["message"],
        "type":      data["type"],
        "source":    data.get("source", "unknown"),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    result = mongo.db.logs.insert_one(log)
    log["_id"] = str(result.inserted_id)

    return jsonify({"status": "Log saved", "id": log["_id"]}), 201


@app.route("/logs", methods=["GET"])
def get_logs():
    """
    Retrieve logs from MongoDB.

    Query params:
        type   — filter by log level  e.g. ?type=ERROR
        source — filter by source     e.g. ?source=api-gateway
        limit  — max results          e.g. ?limit=50  (default 200)
    """
    query = {}

    log_type = request.args.get("type")
    source   = request.args.get("source")
    limit    = int(request.args.get("limit", 200))

    if log_type:
        query["type"] = log_type
    if source:
        query["source"] = source

    logs = list(
        mongo.db.logs.find(query)
        .sort("_id", -1)   # newest first
        .limit(limit)
    )

    return jsonify([serialize(l) for l in logs]), 200


@app.route("/logs/<log_id>", methods=["DELETE"])
def delete_log(log_id):
    """Delete a single log entry by its MongoDB ObjectId."""
    try:
        result = mongo.db.logs.delete_one({"_id": ObjectId(log_id)})
    except Exception:
        return jsonify({"error": "Invalid log ID"}), 400

    if result.deleted_count == 0:
        return jsonify({"error": "Log not found"}), 404

    return jsonify({"status": "Deleted"}), 200


@app.route("/logs", methods=["DELETE"])
def clear_logs():
    """Delete ALL logs — used by the frontend 'clear' button."""
    mongo.db.logs.delete_many({})
    return jsonify({"status": "All logs cleared"}), 200


@app.route("/logs/stats", methods=["GET"])
def get_stats():
    """
    Return a summary count of logs grouped by type.

    Response:
        { "INFO": 42, "WARN": 7, "ERROR": 3, "total": 52 }
    """
    pipeline = [
        {"$group": {"_id": "$type", "count": {"$sum": 1}}}
    ]
    results = list(mongo.db.logs.aggregate(pipeline))

    stats = {"INFO": 0, "WARN": 0, "ERROR": 0}
    for r in results:
        if r["_id"] in stats:
            stats[r["_id"]] = r["count"]

    stats["total"] = sum(stats.values())
    return jsonify(stats), 200


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
