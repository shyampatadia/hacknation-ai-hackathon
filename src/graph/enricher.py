import json
import time
from tqdm import tqdm
from langchain_openai import ChatOpenAI
from sentence_transformers import SentenceTransformer

from src.config.settings import *

class GraphDataEnricher:
    def __init__(self):
        self.embedding_model = SentenceTransformer(EMBEDDING_MODEL_PATH)
        self.llm = ChatOpenAI(model=LLM_MODEL, temperature=0.1)

    # -------------------------
    # GROUP CHUNKS → CONTENT
    # -------------------------
    def group_by_content(self, data):
        from collections import defaultdict
        
        content_map = defaultdict(list)

        for item in data:
            event_id = item.get("event__id", "")
            text = item.get("content__body", "")

            if "_chunk" in event_id:
                base_id, chunk = event_id.split("_chunk")
                chunk_num = int(chunk)
            else:
                base_id = event_id
                chunk_num = 0

            content_map[base_id].append((chunk_num, text))

        final_content = {}
        for cid, chunks in content_map.items():
            chunks_sorted = sorted(chunks, key=lambda x: x[0])
            full_text = "\n".join([c[1] for c in chunks_sorted])
            final_content[cid] = full_text

        return final_content

    # -------------------------
    # SUMMARY
    # -------------------------
    def generate_summaries(self, content_map):
        summaries = {}

        for cid, text in tqdm(content_map.items()):
            prompt = f"""
            You are a technical summarization engine.

            Task: Write ONE single sentence summary.

            Rules:
            - Must be exactly ONE sentence
            - Must be short (max 30 words)
            - Must include: problem + cause + solution (if available)
            - No bullet points
            - No explanations
            - No extra text

            Format:
            Problem - Cause - Solution

            Text:
            {text}
            """

            response = self.llm.invoke(prompt)
            summaries[cid] = response.content.strip()
            time.sleep(10)

        return summaries

    # -------------------------
    # ATTACH SUMMARY BACK
    # -------------------------
    def attach_summaries(self, data, summaries):
        for item in data:
            event_id = item.get("event__id", "")

            base_id = event_id.split("_chunk")[0] if "_chunk" in event_id else event_id
            item["content__summary"] = summaries.get(base_id, "")

        return data

    # -------------------------
    # EMBEDDINGS
    # -------------------------
    def add_embeddings(
                        self,
                        data,
                        text_key="content__body",
                        output_key=None,
                        batch_size=8,
                        use_prefix=True,
                        include_title=False,
                        title_key="content__title"
                    ):
        """
        Adds embeddings to data with batching support.

        Args:
            data (list): list of dicts
            text_key (str): key for main text
            output_key (str): where to store embedding
            batch_size (int): batch size for encoding
            use_prefix (bool): whether to prepend 'passage: '
            include_title (bool): include title + body
            title_key (str): key for title

        Returns:
            list: updated data
        """

        # output key
        if output_key is None:
            output_key = f"{text_key}_embedded"

        for i in tqdm(range(0, len(data), batch_size)):
            batch = data[i:i + batch_size]

            texts = []
            for item in batch:
                body = item.get(text_key, "")

                if include_title:
                    title = item.get(title_key, "")
                    text = f"{title} {body}".strip()
                else:
                    text = body

                if use_prefix:
                    text = f"passage: {text}"

                texts.append(text)

            # encode batch
            embeddings = self.embedding_model.encode(
                texts,
                normalize_embeddings=True
            )

            # assign back
            for j, item in enumerate(batch):
                item[output_key] = embeddings[j].tolist()

        return data
    
    def save_data(self, data):
        with open("/u/users/smm16/datasources/SR_data_1.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

    # -------------------------
    # FULL PIPELINE
    # -------------------------
    def enrich(self, data): 
        # # Generate content_id wise summary 
        # content_map = self.group_by_content(data)
        # summaries = self.generate_summaries(content_map)
        # data = self.attach_summaries(data, summaries)
        
        
        # formatted = [{"content_id": k, "full_content": v} for k, v in content_map.items()
        # ]
        # print(len(formatted))
        # self.save_data(formatted)
        
        
        # print(f"Summary Generation completed") 

        # Embedding for content__body
        text_keys=["content__body", 
                #    "content__summary"
                   ]
        for text_key in text_keys:
            data = self.add_embeddings(data, 
                                       text_key=text_key, 
                                       ) 
            data = self.add_embeddings(data, 
                                       text_key=text_key, 
                                       use_prefix=False,
                                       output_key=f"{text_key}_wo_prefix_embedded"
                                       ) 
            print(f"Embedding generation for {text_key} completed") 
            self.save_data(data)
       
        return data
