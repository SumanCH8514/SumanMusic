<?php
/**
 * index.php - Dynamic Meta Tag Generator for SumanMusic
 * Intercepts crawler requests to provide rich link previews for tracks, albums, and playlists.
 */

// --- CONFIGURATION ---
$GDRIVE_KEYS = [
    "YOUR_API_KEY_1",
    "YOUR_API_KEY_2",
    "YOUR_API_KEY_3",
    "YOUR_API_KEY_4"
];
$DEFAULT_TITLE = "SumanMusic | Stream Your Music Library";
$DEFAULT_DESC = "Connect your Google Drive and start streaming your personal music library with SumanMusic's premium interface.";
$DEFAULT_IMAGE = "https://songs.sumanonline.com/favicon.png";
$BASE_URL = "https://" . $_SERVER['HTTP_HOST'];

// --- HELPER FUNCTIONS ---
function fetch_url($url)
{
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_USERAGENT, 'SumanMusic-Metadata-Fetcher/1.0');
        $response = curl_exec($ch);
        curl_close($ch);
        return $response;
    }
    return @file_get_contents($url);
}

// --- CRAWLER DETECTION ---
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$isCrawler = preg_match('/facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Embedly|googlebot|TelegramBot|Slackbot|discordbot|Applebot|Pingdom|Tumblr/i', $userAgent);

// --- PARAMETER DETECTION (More robust) ---

$queryParams = [];
parse_str($_SERVER['QUERY_STRING'] ?? '', $queryParams);

$trackId = $_GET['trackId'] ?? $queryParams['trackId'] ?? null;
$filter = $_GET['filter'] ?? $queryParams['filter'] ?? null;
$album = $_GET['album'] ?? $queryParams['album'] ?? null;
$artist = $_GET['artist'] ?? $queryParams['artist'] ?? null;
$playlistName = $_GET['name'] ?? $queryParams['name'] ?? null;
$playlistId = $_GET['id'] ?? $queryParams['id'] ?? null;

$title = $DEFAULT_TITLE;
$description = $DEFAULT_DESC;
$image = $DEFAULT_IMAGE;
$type = "website";

if ($isCrawler && ($trackId || $album || $playlistName || $playlistId)) {
    // 1. Handle Track Sharing
    if ($trackId) {
        $type = "music.song";
        $title = "Track on SumanMusic";



        $response = false;
        foreach ($GDRIVE_KEYS as $key) {
            if (empty($key))
                continue;
            $url = "https://www.googleapis.com/drive/v3/files/" . urlencode($trackId) . "?fields=name&key=" . urlencode($key);
            $response = fetch_url($url);
            if ($response && strpos($response, '"name"') !== false)
                break;
        }

        if ($response) {
            $data = json_decode($response, true);
            if (!empty($data['name'])) {
                $rawName = $data['name'];
                // Clean up filename
                $cleanName = preg_replace('/\.(mp3|m4a|wav|flac)$/i', '', $rawName);
                $cleanName = str_ireplace(['SumanOnline.Com', 'SumanOnline', '_'], ['', '', ' '], $cleanName);
                $cleanName = trim(preg_replace('/\s+/', ' ', $cleanName));
                $cleanName = trim($cleanName, " -|_");

                $title = $cleanName;

                // Attempt to split into Artist - Title for better iTunes search
                $searchQuery = $cleanName;
                $parts = preg_split('/\s+[-|]\s+/', $cleanName);
                if (count($parts) >= 2) {
                    // Try searching for just the components which is often more accurate
                    $searchQuery = $parts[0] . " " . $parts[1];
                }

                // Enhance with iTunes API
                $itunesUrl = "https://itunes.apple.com/search?term=" . urlencode($searchQuery) . "&entity=song&limit=1";
                $itunesRes = fetch_url($itunesUrl);
                if ($itunesRes) {
                    $itunesData = json_decode($itunesRes, true);
                    if ($itunesData['resultCount'] > 0) {
                        $res = $itunesData['results'][0];
                        $title = $res['trackName'] . " - " . $res['artistName'];
                        $description = "Album: " . $res['collectionName'] . " | Genre: " . $res['primaryGenreName'] . " | " . date('Y', strtotime($res['releaseDate']));
                        $image = str_replace("100x100bb", "600x600bb", $res['artworkUrl100']);
                    }
                }
            }
        }
    }

    // 2. Handle Album Sharing
    elseif ($filter === 'Albums' && $album) {
        $type = "music.album";
        $title = $album . ($artist ? " - " . $artist : "");
        $description = "Listen to " . $album . " on SumanMusic.";

        $query = urlencode($album . ($artist ? " " . $artist : ""));
        $itunesUrl = "https://itunes.apple.com/search?term=" . $query . "&entity=album&limit=1";
        $itunesRes = fetch_url($itunesUrl);
        if ($itunesRes) {
            $itunesData = json_decode($itunesRes, true);
            if ($itunesData['resultCount'] > 0) {
                $res = $itunesData['results'][0];
                $title = $res['collectionName'] . " - " . $res['artistName'];
                $image = str_replace("100x100bb", "600x600bb", $res['artworkUrl100']);
                $description = "Album • " . $res['primaryGenreName'] . " • " . date('Y', strtotime($res['releaseDate']));
            }
        }
    }

    // 3. Handle Artist Sharing
    elseif ($filter === 'Artists' && $artist) {
        $type = "profile";
        $title = $artist;
        $description = "Check out " . $artist . " on SumanMusic.";

        $query = urlencode($artist);
        $itunesUrl = "https://itunes.apple.com/search?term=" . $query . "&entity=musicArtist&limit=1";
        $itunesRes = fetch_url($itunesUrl);
        if ($itunesRes) {
            $itunesData = json_decode($itunesRes, true);
            if ($itunesData['resultCount'] > 0) {
                $res = $itunesData['results'][0];
                $title = $res['artistName'];
                $description = "Artist • " . ($res['primaryGenreName'] ?? 'Music');

                // Fetch an album cover to use as the artist image (iTunes doesn't always provide artist images in search)
                $albumSearch = "https://itunes.apple.com/search?term=" . $query . "&entity=album&limit=1";
                $albumRes = fetch_url($albumSearch);
                if ($albumRes) {
                    $albumData = json_decode($albumRes, true);
                    if ($albumData['resultCount'] > 0) {
                        $image = str_replace("100x100bb", "600x600bb", $albumData['results'][0]['artworkUrl100']);
                    }
                }
            }
        }
    }

    // 3. Handle Playlist Sharing
    elseif ($filter === 'Playlists' && ($playlistName || $playlistId)) {
        $type = "music.playlist";
        $title = $playlistName ? $playlistName : "Shared Playlist";
        $description = "Check out this playlist on SumanMusic!";
    // We could fetch from Firestore here if we had the Project ID and didn't mind the latency
    }

    // --- INJECT METADATA INTO TEMPLATE ---
    if (file_exists('index.html')) {
        $html = file_get_contents('index.html');

        // Simple regex-based replacement
        $html = preg_replace('/<title>.*?<\/title>/', "<title>" . htmlspecialchars($title) . "</title>", $html);

        // Open Graph
        $html = preg_replace('/<meta property="og:type" content=".*?" \/>/', '<meta property="og:type" content="' . $type . '" />', $html);
        $html = preg_replace('/<meta property="og:title" content=".*?" \/>/', '<meta property="og:title" content="' . htmlspecialchars($title) . '" />', $html);
        $html = preg_replace('/<meta property="og:description" content=".*?" \/>/', '<meta property="og:description" content="' . htmlspecialchars($description) . '" />', $html);
        $html = preg_replace('/<meta property="og:image" content=".*?" \/>/', '<meta property="og:image" content="' . htmlspecialchars($image) . '" />', $html);
        $html = preg_replace('/<meta property="og:url" content=".*?" \/>/', '<meta property="og:url" content="' . $BASE_URL . $_SERVER['REQUEST_URI'] . '" />', $html);

        // Twitter
        $html = preg_replace('/<meta property="twitter:title" content=".*?" \/>/', '<meta property="twitter:title" content="' . htmlspecialchars($title) . '" />', $html);
        $html = preg_replace('/<meta property="twitter:description" content=".*?" \/>/', '<meta property="twitter:description" content="' . htmlspecialchars($description) . '" />', $html);
        $html = preg_replace('/<meta property="twitter:image" content=".*?" \/>/', '<meta property="twitter:image" content="' . htmlspecialchars($image) . '" />', $html);

        echo $html;
    }
    else {
        // Fallback for dev or missing file
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><?php echo htmlspecialchars($title); ?></title>
    <meta property="og:title" content="<?php echo htmlspecialchars($title); ?>">
    <meta property="og:description" content="<?php echo htmlspecialchars($description); ?>">
    <meta property="og:image" content="<?php echo htmlspecialchars($image); ?>">
    <meta name="twitter:card" content="summary_large_image">
</head>
<body>
    <script>window.location.href = "/index.html<?php echo $_SERVER['QUERY_STRING'] ? '?' . $_SERVER['QUERY_STRING'] : ''; ?>";</script>
</body>
</html>
        <?php
    }
    exit;
}

// --- SERVE THE REGULAR SPA ---
if (file_exists('index.html')) {
    echo file_get_contents('index.html');
}
else {
    echo "SumanMusic: App is loading...";
}
