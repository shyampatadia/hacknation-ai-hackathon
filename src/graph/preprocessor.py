import re
import ast
import json
import shlex

class DataPreprocessor:
    @staticmethod
    def extract_ref_ids(text):
        pattern = re.compile(r"\b(?:QA|BR|SR)\d+\b")
        return list(set(pattern.findall(text)))

    @staticmethod
    def clean_brands(brands):
        return list(set(b.strip().lower().replace(' ', '_') for b in brands if b.strip()))

    @staticmethod
    def clean_keywords(keywords):
        tokens = []
        for kw in keywords:
            kw = kw.strip()
            if ',' in kw:
                tokens.extend([t.strip() for t in kw.split(',') if t.strip()])
            elif '"' in kw or "'" in kw:
                tokens.extend(shlex.split(kw, posix=False))
            else:
                tokens.append(kw)
        return list(set(tokens))
    
    @staticmethod
    def clean_list_field(value):
        if isinstance(value, list):
            return value

        if isinstance(value, str):
            try:
                return json.loads(value)  # best case
            except:
                return ast.literal_eval(value)  # fallback

        return []
    
    def clean(self, data):
        """Runs all preprocessing steps."""
        processed = []
        for d in data:
            d["specialties"] = self.clean_list_field(d.get("specialties", []))
            d["procedure"] = self.clean_list_field(d.get("procedure", []))
            d["capability"] = self.clean_list_field(d.get("capability", []))
            d["equipment"] = self.clean_list_field(d.get("equipment", []))


            processed.append(d)
        print("Preprocessing completed")
        return processed
    
   
