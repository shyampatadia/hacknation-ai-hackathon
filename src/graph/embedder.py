from sentence_transformers import SentenceTransformer

from src.config.settings import *

class E5Embedder:
    def __init__(self):
        self.model = SentenceTransformer(EMBEDDING_MODEL_PATH)

    # single query
    def embed_query(self, text):
        return self.model.encode(
            text,
            normalize_embeddings=True
        ).tolist()

    # batch mode
    def embed_documents(self, texts):
        return self.model.encode(
            texts,
            normalize_embeddings=True
        ).tolist()