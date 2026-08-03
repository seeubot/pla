def parse_m3u_to_channels_v2(m3u_content):
    """Parse M3U with EXTVLCOPT headers support"""
    lines = m3u_content.split('\n')
    channels_dict = {}
    current = {
        'clearKey': None, 'url': None, 'name': '', 'logo': None,
        'group': 'General', 'language': '', 'serverName': None,
        'headers': {}  # Store custom headers
    }
    
    for line in lines:
        line = line.strip()
        
        if line.startswith('#EXTVLCOPT:http-referrer='):
            current['headers']['Referer'] = line.split('=')[1]
        elif line.startswith('#EXTVLCOPT:http-origin='):
            current['headers']['Origin'] = line.split('=')[1]
        elif line.startswith('#EXTVLCOPT:http-user-agent='):
            current['headers']['User-Agent'] = line.split('=')[1]
        elif line.startswith('#EXTINF:'):
            if current['url'] and current['name']:
                add_to_channels_v2(channels_dict, current)
            
            name_match = line.split(',')[-1] if ',' in line else 'Unknown'
            logo_match = None
            group_match = None
            lang_match = None
            server_match = None
            
            if 'tvg-logo="' in line:
                logo_match = line.split('tvg-logo="')[1].split('"')[0]
            if 'group-title="' in line:
                group_match = line.split('group-title="')[1].split('"')[0]
            if 'tvg-language="' in line:
                lang_match = line.split('tvg-language="')[1].split('"')[0]
            if 'server-name="' in line:
                server_match = line.split('server-name="')[1].split('"')[0]
            
            current = {
                'name': name_match.strip(),
                'logo': logo_match,
                'group': group_match or 'General',
                'language': lang_match or '',
                'clearKey': None,
                'url': None,
                'serverName': server_match,
                'headers': {}  # Reset headers for new channel
            }
            
        elif line.startswith('#KODIPROP:') and 'license_key=' in line:
            key_match = line.split('license_key=')[1].strip()
            current['clearKey'] = key_match
            
        elif line.startswith('https://') and not line.startswith('#'):
            current['url'] = line
            if current['name']:
                add_to_channels_v2(channels_dict, current)
                current = {
                    'clearKey': None, 'url': None, 'name': '', 'logo': None,
                    'group': 'General', 'language': '', 'serverName': None,
                    'headers': {}
                }
    
    if current['url'] and current['name']:
        add_to_channels_v2(channels_dict, current)
    
    return list(channels_dict.values())

def add_to_channels_v2(channels_dict, channel):
    """Add channel with headers support"""
    base_name = channel['name'].replace(' HD', '').replace('HD', '').replace(' 2', '').strip()
    server_name = channel.get('serverName') or ('HD' if 'HD' in channel['name'] else 'SD')
    
    server_data = {
        'name': server_name,
        'url': channel['url'],
        'drm': 'clearkey' if channel['clearKey'] else '',
        'license': channel['clearKey'] or ''
    }
    
    # Add headers if present
    if channel.get('headers'):
        server_data['headers'] = channel['headers']
    
    if base_name not in channels_dict:
        channels_dict[base_name] = {
            'id': base_name.lower().replace(' ', '_').replace('(', '').replace(')', ''),
            'name': base_name,
            'language': channel['language'],
            'logo': channel['logo'],
            'group': channel['group'],
            'servers': [server_data]
        }
    else:
        existing = channels_dict[base_name]
        exists = any(s['url'] == channel['url'] for s in existing.get('servers', []))
        if not exists:
            if 'servers' not in existing:
                existing['servers'] = [{
                    'name': 'Default',
                    'url': existing.get('url', ''),
                    'drm': existing.get('drm', ''),
                    'license': existing.get('license', '')
                }]
                for key in ['url', 'drm', 'license']:
                    existing.pop(key, None)
            
            existing['servers'].append(server_data)