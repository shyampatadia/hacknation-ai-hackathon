import json
import pandas as pd
from typing import List, Dict

from pprint import pprint

class DataLoader:
    def load_json(self, path: str) -> List[Dict]:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"Loaded {len(data)} items from {path}")
        return data

    def load_multiple_json(self, paths: List[str]) -> List[Dict]:
        all_data = []
        for p in paths:
            all_data.extend(self.load_json(p))
        return all_data
    
    def load_csv(self, path: str) -> List[Dict]:
        df = pd.read_csv(path)   # reads .xlsx
        data = df.to_dict(orient="records")  # convert to list of dicts
        # pprint(data[0])
        print(f"Loaded {len(data)} items from {path}")
        return data