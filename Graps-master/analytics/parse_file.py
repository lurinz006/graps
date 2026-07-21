import sys
import json
import os
import pandas as pd
import numpy as np
from datetime import datetime, date, time

def parse_date_val(val):
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.strftime('%Y-%m-%d')
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ['nat', 'nan', 'null']:
        return None
    try:
        for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S', '%m/%d/%Y %H:%M:%S', '%d/%m/%Y %H:%M:%S'):
            try:
                return datetime.strptime(val_str, fmt).strftime('%Y-%m-%d')
            except ValueError:
                pass
        dt = pd.to_datetime(val_str, errors='coerce')
        if not pd.isna(dt):
            return dt.strftime('%Y-%m-%d')
    except Exception:
        pass
    return val_str

def parse_time_val(val):
    if val is None:
        return None
    if isinstance(val, (datetime, time)):
        return val.strftime('%H:%M:%S')
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ['nat', 'nan', 'null']:
        return None
    try:
        for fmt in ('%H:%M:%S', '%I:%M:%S %p', '%H:%M', '%I:%M %p'):
            try:
                return datetime.strptime(val_str, fmt).strftime('%H:%M:%S')
            except ValueError:
                pass
        dt = pd.to_datetime(val_str, errors='coerce')
        if not pd.isna(dt):
            return dt.strftime('%H:%M:%S')
    except Exception:
        pass
    return val_str

def infer_severity(incident_type, offense):
    it = str(incident_type or '').strip().lower()
    off = str(offense or '').strip().lower()
    
    it_clean = it.replace('(incident)', '').replace('(operation)', '').replace('(simple)', '').strip()
    
    # Critical Keywords (100.0)
    critical_keywords = {'rape', 'shooting', 'stabbing', 'murder', 'homicide'}
    if any(kw in it_clean for kw in critical_keywords) or any(kw in off for kw in critical_keywords):
        return 100.0
        
    # High Keywords (50.0)
    high_keywords = {'violence against women', 'child abuse', 'drug-related', 'buy bust', 'physical injury', 'physical injuries', 'robbery', 'ra 9262', 'ra 7610', 'ra 9165', 'dangerous drugs'}
    if any(kw in it_clean for kw in high_keywords) or any(kw in off for kw in high_keywords):
        return 50.0
        
    # Medium Keywords (25.0)
    medium_keywords = {'carnapping', 'motornapping', 'theft', 'lasciviousness', 'mauling', 'gambling', 'ra 10883'}
    if any(kw in it_clean for kw in medium_keywords) or any(kw in off for kw in medium_keywords):
        return 25.0
        
    return 10.0

def load_df(file_path, ext):
    common_keywords = {'pro', 'ppo', 'stn', 'region', 'province', 'municipal', 'barangay', 'monthly', 'monhtly', 'datereported', 'datecommitted', 'lat', 'lng', 'latitude', 'longitude', 'severity', 'value'}
    
    if ext == '.csv':
        try:
            df_first = pd.read_csv(file_path, nrows=1, encoding='utf-8')
        except UnicodeDecodeError:
            df_first = pd.read_csv(file_path, nrows=1, encoding='latin-1')
            
        cols = [str(c).strip().lower() for c in df_first.columns]
        has_headers = any(col in common_keywords for col in cols)
        
        try:
            if has_headers:
                df = pd.read_csv(file_path, encoding='utf-8')
            else:
                df = pd.read_csv(file_path, header=None, encoding='utf-8')
                default_cols = ['pro', 'ppo', 'stn', 'region', 'province', 'municipal', 'barangay', 'monthly', 'datereported', 'timereported', 'datecommitted', 'timecommitted', 'incidenttype', 'iscime', 'stageoffelony', 'offense', 'offensetype', 'lat', 'lng', 'severity', 'value']
                df.columns = default_cols[:len(df.columns)]
        except UnicodeDecodeError:
            if has_headers:
                df = pd.read_csv(file_path, encoding='latin-1')
            else:
                df = pd.read_csv(file_path, header=None, encoding='latin-1')
                default_cols = ['pro', 'ppo', 'stn', 'region', 'province', 'municipal', 'barangay', 'monthly', 'datereported', 'timereported', 'datecommitted', 'timecommitted', 'incidenttype', 'iscime', 'stageoffelony', 'offense', 'offensetype', 'lat', 'lng', 'severity', 'value']
                df.columns = default_cols[:len(df.columns)]
        return df
    elif ext in ['.xlsx', '.xls']:
        xl = pd.ExcelFile(file_path)
        dfs = []
        for sheet_name in xl.sheet_names:
            df_first = xl.parse(sheet_name, nrows=1)
            cols = [str(c).strip().lower() for c in df_first.columns]
            has_headers = any(col in common_keywords for col in cols)
            
            if has_headers:
                df = xl.parse(sheet_name)
            else:
                df = xl.parse(sheet_name, header=None)
                default_cols = ['pro', 'ppo', 'stn', 'region', 'province', 'municipal', 'barangay', 'monthly', 'datereported', 'timereported', 'datecommitted', 'timecommitted', 'incidenttype', 'iscime', 'stageoffelony', 'offense', 'offensetype', 'lat', 'lng', 'severity', 'value']
                df.columns = default_cols[:len(df.columns)]
            dfs.append(df)
        return pd.concat(dfs, ignore_index=True) if dfs else pd.DataFrame()
    else:
        raise ValueError(f"Unsupported file extension: {ext}")

def parse_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    combined_df = load_df(file_path, ext)
    
    if combined_df.empty:
        return []
        
    combined_df = combined_df.replace({np.nan: None})
    
    records = []
    for _, row in combined_df.iterrows():
        row_dict = row.to_dict()
        
        normalized_row = {}
        for k, v in row_dict.items():
            if k is not None:
                normalized_row[str(k).strip().lower()] = v
                
        mapped = {}
        mapped['pro'] = str(normalized_row.get('pro')) if normalized_row.get('pro') is not None else None
        mapped['ppo'] = str(normalized_row.get('ppo')) if normalized_row.get('ppo') is not None else None
        mapped['stn'] = str(normalized_row.get('stn')) if normalized_row.get('stn') is not None else None
        mapped['region'] = str(normalized_row.get('region')) if normalized_row.get('region') is not None else None
        mapped['province'] = str(normalized_row.get('province')) if normalized_row.get('province') is not None else None
        mapped['municipal'] = str(normalized_row.get('municipal')) if normalized_row.get('municipal') is not None else None
        mapped['barangay'] = str(normalized_row.get('barangay')) if normalized_row.get('barangay') is not None else None
        
        mapped['MONHTLY'] = str(normalized_row.get('monhtly') or normalized_row.get('monthly')) if (normalized_row.get('monhtly') or normalized_row.get('monthly')) is not None else None
        
        mapped['dateReported'] = parse_date_val(normalized_row.get('datereported'))
        mapped['timeReported'] = parse_time_val(normalized_row.get('timereported'))
        mapped['dateCommitted'] = parse_date_val(normalized_row.get('datecommitted'))
        mapped['timeCommitted'] = parse_time_val(normalized_row.get('timecommitted'))
        
        mapped['incidentType'] = str(normalized_row.get('incidenttype')) if normalized_row.get('incidenttype') is not None else None
        mapped['iscime'] = str(normalized_row.get('iscime')) if normalized_row.get('iscime') is not None else None
        mapped['stageoffelony'] = str(normalized_row.get('stageoffelony')) if normalized_row.get('stageoffelony') is not None else None
        mapped['offense'] = str(normalized_row.get('offense') or normalized_row.get('law')) if (normalized_row.get('offense') or normalized_row.get('law')) is not None else None
        mapped['offenseType'] = str(normalized_row.get('offensetype')) if normalized_row.get('offensetype') is not None else None
        
        lat_val = normalized_row.get('lat') or normalized_row.get('latitude')
        lng_val = normalized_row.get('lng') or normalized_row.get('longitude')
        try:
            mapped['lat'] = float(lat_val) if lat_val is not None else None
        except Exception:
            mapped['lat'] = None
            
        try:
            mapped['lng'] = float(lng_val) if lng_val is not None else None
        except Exception:
            mapped['lng'] = None
            
        val = normalized_row.get('value')
        sev = normalized_row.get('severity')
        
        final_value = 10.0
        
        if val is not None:
            try:
                final_value = float(val)
            except Exception:
                pass
        elif sev is not None:
            sev_str = str(sev).strip().lower()
            if sev_str == 'critical':
                final_value = 100.0
            elif sev_str == 'high':
                final_value = 50.0
            elif sev_str == 'medium':
                final_value = 25.0
            elif sev_str == 'low':
                final_value = 10.0
        else:
            final_value = infer_severity(mapped['incidentType'], mapped['offense'])
                
        mapped['value'] = final_value
        
        if any(v is not None for v in mapped.values() if v != 10.0):
            records.append(mapped)
            
    return records

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File not found: {file_path}"}))
        sys.exit(1)
        
    try:
        results = parse_file(file_path)
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
