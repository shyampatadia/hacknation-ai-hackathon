from tqdm import tqdm
from typing import List, Dict, Optional
from neo4j_graphrag.indexes import create_vector_index
from src.graph.embedder import E5Embedder

from src.config.settings import *

class GraphBuilderNeo:
    def __init__(self, 
                 driver, 
                 ):
        self.driver = driver
        self.embedder = E5Embedder()

      
    def build_graph(
        self,
        data: Optional[List[Dict]] = None,
    ):
        """
        Main entry point:
        supports:
        - build_graph(data=[...])
        """

        with self.driver.session() as session:
            for d in tqdm(data, desc="Building Neo4j graph"):
                session.execute_write(self._build_nodes, d)


        print(f"Graph built successfully with {len(data)} records")


    def _build_nodes(self, tx, d):
        name = d.get('name', "")   
        specialties = d.get("specialties", [])
        procedures = d.get("procedure", [])
        capabilities = d.get("capability", [])  
        equipments = d.get("equipment", [])  


        # embeddings 
        specialty_embeddings = {s: self.embedder.embed_query(s) for s in specialties}
        procedure_embeddings = {p: self.embedder.embed_query(p) for p in procedures}
        capability_embeddings = {c: self.embedder.embed_query(c) for c in capabilities}
        equipment_embeddings = {c: self.embedder.embed_query(c) for c in equipments}

        facility_attrs = {
            'facilityTypeId': d.get('facilityTypeId', ''),
            'phone_numbers': d.get('phone_numbers', ''),
            'officialPhone': d.get('officialPhone', ''),
            'email': d.get('email', ''),
            'address_line1': d.get('address_line1', ''),
            'address_line2': d.get('address_line2', ''),
            'address_line3': d.get('address_line3', ''),
            'address_city': d.get('address_city', ''),
            'address_country': d.get('address_country', ''),
            'address_countryCode': d.get('address_countryCode', ''),
            'latitude': d.get('latitude', ''),
            'longitude': d.get('longitude', ''),
            'specialties': d.get("specialties", [])
        }

        # Create Facility Nodes
        tx.run("""
            MERGE (f:Facility {name: $name})
            SET f += $facility_attrs
        """,
        name=name,
        facility_attrs=facility_attrs
        )

        all_concepts = [
                    (specialties, "specialty"),
                    (procedures, "procedure"),
                    (capabilities, "capability"),
                    (equipments, "equipment"),
                ]
        
        embeddings = {}
        for concept_list, _ in all_concepts:
            for c in concept_list:
                if c and c not in embeddings:
                    embeddings[c] = self.embedder.embed_query(c)

        
        # Attach Concepts to Facility
        for concept_list, ctype in all_concepts:
            for c in concept_list:
                if not c:
                    continue

                emb = embeddings.get(c)
                if emb is None:
                    continue

                tx.run("""
                    MATCH (f:Facility {name: $name})

                    MERGE (c:Concept {name: $cname, type: $type})
                    SET c.embedding = $embedding

                    MERGE (f)-[:HAS_CONCEPT]->(c)
                """,
                name=name,
                cname=c,
                type=ctype,
                embedding=emb
                )

        
    def create_vector_indexes(self, driver, index_config, label="Concept", dimensions=1024):
        for index_name, embedding_property in index_config.items():
            print(f"Creating index: {index_name} on {embedding_property}")
            
            create_vector_index(
                driver,
                name=index_name,
                label=label,
                embedding_property=embedding_property,
                dimensions=dimensions,
                similarity_fn="cosine"
            )
