from core.retriever import retrieve
res = retrieve("ඔබගේ සේවා වේලාව කවරේද?")
for r in res:
    print(r["score"], r["payload"]["filename"], r["payload"]["preview"][:120])
