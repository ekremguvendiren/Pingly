use rand::Rng;
use std::process::Command;

use tauri::{Emitter, Window};
use tokio::time::Instant;

#[derive(Clone, serde::Serialize)]
struct SpeedTestPayload {
    phase: String, // "ping", "download", "upload", "complete"
    ping_avg: Option<u32>,
    jitter: Option<u32>,
    packet_loss: Option<f32>,
    download_speed: Option<f32>, // Mbps
    upload_speed: Option<f32>,   // Mbps
    progress: f32,               // 0.0 to 1.0 progress for current phase
    loaded_latency: Option<f32>, // Combined Bufferbloat metric
    loaded_latency_download: Option<f32>,
    loaded_latency_upload: Option<f32>,
    client_ip: Option<String>,
    client_isp: Option<String>,
    location: Option<String>,
}

// Old GamePing struct removed

#[derive(Debug, serde::Serialize, Clone)]
struct DnsBenchmarkResult {
    provider: String,
    ip: String,
    latency: f32,
}

#[tauri::command]
fn simple_ping(host: &str) -> String {
    #[cfg(target_os = "windows")]
    let mut cmd = Command::new("ping");
    #[cfg(target_os = "windows")]
    cmd.args(["-n", "1", host]);

    #[cfg(not(target_os = "windows"))]
    let mut cmd = Command::new("ping");
    #[cfg(not(target_os = "windows"))]
    cmd.args(["-c", "1", host]);

    // Set a timeout to avoid hanging indefinitely if logic allows (ping command has -w or -W)
    // Mac: -W 1000 (ms), Windows: -w 1000 (ms)
    #[cfg(not(target_os = "windows"))]
    cmd.args(["-W", "1000"]);
    #[cfg(target_os = "windows")]
    cmd.args(["-w", "1000"]);

    let output = cmd.output();

    match output {
        Ok(o) => {
            if o.status.success() {
                let stdout = String::from_utf8_lossy(&o.stdout);
                if let Some(time_idx) = stdout.find("time=") {
                    let rest = &stdout[time_idx + 5..];
                    if let Some(end_idx) = rest.find(" ") {
                        return rest[..end_idx].to_string();
                    }
                }
                // Windows sometimes output: "time<1ms"
                if stdout.contains("time<1ms") {
                    return "0".to_string();
                }
                "OK".to_string()
            } else {
                "Fail".to_string()
            }
        }
        Err(_) => "Error".to_string(),
    }
}

// Helper to reliably get system DNS on Mac/Linux
fn get_system_dns() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("scutil").args(["--dns"]).output().ok()?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        // Find "nameserver[0] : 1.2.3.4"
        // typically first one in "resolver #1" block
        if let Some(idx) = stdout.find("nameserver[0] : ") {
            let rest = &stdout[idx + 16..];
            if let Some(end) = rest.find("\n") {
                return Some(rest[..end].trim().to_string());
            }
        }
    }
    None
}

#[tauri::command]
async fn run_dns_benchmark(window: Window) {
    let targets = vec![
        ("Cloudflare", "1.1.1.1"),
        ("Google", "8.8.8.8"),
        ("OpenDNS", "208.67.222.222"),
        ("Quad9", "9.9.9.9"),
        ("AdGuard", "94.140.14.14"),
        ("Comodo", "8.26.56.26"),
        ("Verisign", "64.6.64.6"),
        ("Level3", "4.2.2.1"),
        ("Control D", "76.76.2.0"),
        ("CleanBrowsing", "185.228.168.9"),
        ("Alternate DNS", "76.76.19.19"),
    ];

    // System Default
    if let Some(sys_ip) = get_system_dns() {
        let sys_res = simple_ping(&sys_ip);
        // Emit result
        window
            .emit(
                "dns-update",
                DnsBenchmarkResult {
                    provider: "System Default".to_string(),
                    ip: sys_ip,
                    latency: sys_res.parse().unwrap_or(999.0),
                },
            )
            .unwrap();
    } else {
        window
            .emit(
                "dns-update",
                DnsBenchmarkResult {
                    provider: "System Default".to_string(),
                    ip: "Unknown".to_string(),
                    latency: 0.0,
                },
            )
            .unwrap();
    }

    // Iterate and emit one by one
    for (name, ip) in targets {
        // Optional: Emit "starting" status if we want very granular UI, but per-item result is usually enough for "smoothness"
        let res = simple_ping(ip);
        window
            .emit(
                "dns-update",
                DnsBenchmarkResult {
                    provider: name.to_string(),
                    ip: ip.to_string(),
                    latency: res.parse().unwrap_or(999.0),
                },
            )
            .unwrap();
        // Small delay to let UI breathe/animate if needed, though not strictly necessary if async
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
}

#[derive(Debug, serde::Serialize, Clone)]
struct GamePing {
    game: String,
    region: String,
    latency: f32,
    jitter: f32,
    status: String,
}

async fn icmp_measure(host: &str) -> Option<f32> {
    #[cfg(target_os = "windows")]
    let mut cmd = tokio::process::Command::new("ping");
    #[cfg(target_os = "windows")]
    cmd.args(["-n", "1", "-w", "1000", host]);

    #[cfg(not(target_os = "windows"))]
    let mut cmd = tokio::process::Command::new("ping");
    #[cfg(not(target_os = "windows"))]
    cmd.args(["-c", "1", "-W", "1000", host]);

    // Use output() to get stdout
    match cmd.output().await {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                // Parse "time=123.45 ms" or "time=12ms"
                if let Some(idx) = stdout.find("time=") {
                    let rest = &stdout[idx + 5..];
                    if let Some(end) = rest.find(" ") {
                        return rest[..end].parse::<f32>().ok();
                    }
                }
                // Windows "time<1ms"
                if stdout.contains("time<1ms") {
                    return Some(1.0);
                }
            }
            None
        }
        Err(_) => None,
    }
}

async fn measure_target(provider: String, region: String, ip: String, _port: u16, window: Window) {
    let mut latencies = Vec::new();

    // Perform 3 pings
    for _ in 0..3 {
        // Use ICMP measure instead of TCP
        if let Some(ms) = icmp_measure(&ip).await {
            latencies.push(ms);
        }
        // Small delay
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
    }

    let (latency, jitter, status) = if latencies.is_empty() {
        (0.0, 0.0, "maintenance".to_string())
    } else {
        let avg: f32 = latencies.iter().sum::<f32>() / latencies.len() as f32;

        // Calculate Jitter
        let jitter_val: f32 =
            latencies.iter().map(|l| (l - avg).abs()).sum::<f32>() / latencies.len() as f32;

        (avg, jitter_val, "stable".to_string())
    };

    let payload = GamePing {
        game: provider,
        region,
        latency,
        jitter,
        status,
    };

    window.emit("game-ping", payload).unwrap();
}

#[tauri::command]
async fn ping_game_servers(window: Window) {
    let targets = vec![
        // --- League of Legends ---
        (
            "League of Legends",
            "EU West (Amsterdam)",
            "104.160.141.3",
            443,
        ),
        (
            "League of Legends",
            "EU Nordic & East (Frankfurt)",
            "104.160.142.3",
            443,
        ),
        (
            "League of Legends",
            "Turkey (Istanbul)",
            "104.160.143.212",
            443,
        ),
        (
            "League of Legends",
            "North America (Chicago)",
            "104.160.131.3",
            443,
        ),
        (
            "League of Legends",
            "Brazil (Sao Paulo)",
            "104.160.152.3",
            443,
        ),
        (
            "League of Legends",
            "Oceania (Sydney)",
            "104.160.156.1",
            443,
        ),
        ("League of Legends", "Korea (Seoul)", "104.160.135.1", 443),
        // --- Valorant ---
        ("Valorant", "Frankfurt", "104.160.142.3", 443),
        ("Valorant", "Paris", "52.47.0.1", 443),
        ("Valorant", "London", "35.176.0.1", 443),
        ("Valorant", "Istanbul", "104.160.143.212", 443),
        ("Valorant", "NA East (N. Virginia)", "23.23.0.1", 443),
        ("Valorant", "NA West (N. California)", "54.215.0.1", 443),
        ("Valorant", "Tokyo", "52.192.0.1", 443),
        ("Valorant", "Singapore", "151.106.248.1", 443),
        // --- Counter-Strike 2 ---
        (
            "Counter-Strike 2",
            "EU West (Luxembourg)",
            "146.66.152.1",
            27015,
        ),
        (
            "Counter-Strike 2",
            "EU East (Vienna)",
            "146.66.155.1",
            27015,
        ),
        (
            "Counter-Strike 2",
            "Poland (Warsaw)",
            "155.133.230.1",
            27015,
        ),
        ("Counter-Strike 2", "Spain (Madrid)", "155.133.246.1", 27015),
        (
            "Counter-Strike 2",
            "US East (Sterling)",
            "162.254.192.1",
            27015,
        ),
        (
            "Counter-Strike 2",
            "US West (Seattle)",
            "155.133.253.38",
            27015,
        ),
        ("Counter-Strike 2", "Japan (Tokyo)", "155.133.239.25", 27015),
        ("Counter-Strike 2", "Singapore", "103.10.124.1", 27015),
        (
            "Counter-Strike 2",
            "Australia (Sydney)",
            "103.10.125.1",
            27015,
        ),
        // --- Apex Legends ---
        ("Apex Legends", "EU (Frankfurt)", "52.58.0.1", 443),
        ("Apex Legends", "EU (London)", "35.176.0.1", 443),
        ("Apex Legends", "EU (Belgium)", "52.28.63.252", 443),
        ("Apex Legends", "NA East (Virginia)", "52.4.0.1", 443),
        ("Apex Legends", "NA West (Oregon)", "54.184.0.1", 443),
        ("Apex Legends", "Asia (Tokyo)", "52.192.0.1", 443),
        ("Apex Legends", "Asia (Singapore)", "54.251.0.1", 443),
        // --- Fortnite ---
        ("Fortnite", "EU (Frankfurt)", "52.28.0.1", 443),
        ("Fortnite", "EU (London)", "35.178.0.1", 443),
        ("Fortnite", "EU (Paris)", "52.47.0.1", 443),
        ("Fortnite", "NA East (Virginia)", "3.80.0.1", 443),
        ("Fortnite", "NA Central (Dallas)", "52.95.0.1", 443),
        ("Fortnite", "NA West (California)", "13.52.0.1", 443),
        ("Fortnite", "Asia (Tokyo)", "18.176.0.1", 443),
        // --- Roblox ---
        ("Roblox", "Europe (Frankfurt)", "128.116.123.0", 443),
        ("Roblox", "North America (Ashburn)", "128.116.104.0", 443),
        ("Roblox", "Asia (Singapore)", "128.116.97.0", 443),
        // --- Overwatch 2 (Blizzard) ---
        ("Overwatch 2", "Europe (Amsterdam)", "185.60.112.157", 443),
        (
            "Overwatch 2",
            "North America (Chicago)",
            "24.105.30.129",
            443,
        ),
        ("Overwatch 2", "Asia (Korea)", "211.115.106.1", 443),
    ];

    let mut tasks = Vec::new();

    for (provider, region, ip, port) in targets {
        let w = window.clone();
        let p = provider.to_string();
        let r = region.to_string();
        let i = ip.to_string();

        let task = tokio::spawn(async move {
            measure_target(p, r, i, port, w).await;
        });
        tasks.push(task);
    }

    // Wait for all tasks to complete
    for task in tasks {
        let _ = task.await;
    }
}

#[tauri::command]
async fn run_full_speed_test(window: Window) {
    let client = reqwest::Client::new();

    // 0. Fetch Client Info
    let mut client_ip = None;
    let mut client_isp = None;
    let mut location = None;

    if let Ok(resp) = client.get("http://ip-api.com/json").send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            client_ip = json["query"].as_str().map(|s| s.to_string());
            client_isp = json["isp"].as_str().map(|s| s.to_string());
            let city = json["city"].as_str().unwrap_or("Unknown");
            let country = json["countryCode"].as_str().unwrap_or("");
            location = Some(format!("{}, {}", city, country));
        }
    }

    // Helper to create SpeedTestPayload
    let make_payload = |phase: &str,
                        valid_ping: Option<u32>,
                        valid_jitter: Option<u32>,
                        valid_loss: Option<f32>,
                        dl: Option<f32>,
                        ul: Option<f32>,
                        prog: f32,
                        loaded: Option<f32>,
                        loaded_dl: Option<f32>,
                        loaded_ul: Option<f32>| {
        SpeedTestPayload {
            phase: phase.to_string(),
            ping_avg: valid_ping,
            jitter: valid_jitter,
            packet_loss: valid_loss,
            download_speed: dl,
            upload_speed: ul,
            progress: prog,
            loaded_latency: loaded,
            loaded_latency_download: loaded_dl,
            loaded_latency_upload: loaded_ul,
            client_ip: client_ip.clone(),
            client_isp: client_isp.clone(),
            location: location.clone(),
        }
    };

    // 1. PING Phase (Unloaded)
    let mut latencies = Vec::new();
    let ping_count = 10;
    let mut success_count = 0;

    for _ in 0..ping_count {
        let res = simple_ping("1.1.1.1");
        if res != "Fail" && res != "Error" {
            if let Ok(ms) = res.parse::<f32>() {
                latencies.push(ms);
                success_count += 1;
            }
        }
        window
            .emit(
                "speed-update",
                make_payload(
                    "ping",
                    None,
                    None,
                    None,
                    None,
                    None,
                    latencies.len() as f32 / ping_count as f32,
                    None,
                    None,
                    None,
                ),
            )
            .unwrap();
    }

    let avg_ping = if !latencies.is_empty() {
        latencies.iter().sum::<f32>() / latencies.len() as f32
    } else {
        0.0
    };

    let jitter = if latencies.len() > 1 {
        let variance = latencies
            .iter()
            .map(|&x| (x - avg_ping).powi(2))
            .sum::<f32>()
            / (latencies.len() - 1) as f32;
        variance.sqrt()
    } else {
        0.0
    };

    let packet_loss = ((ping_count - success_count) as f32 / ping_count as f32) * 100.0;

    window
        .emit(
            "speed-update",
            make_payload(
                "download_start",
                Some(avg_ping as u32),
                Some(jitter as u32),
                Some(packet_loss),
                None,
                None,
                0.0,
                None,
                None,
                None,
            ),
        )
        .unwrap();

    // 2. DOWNLOAD Phase (Speed.cloudflare.com)
    let url = "https://speed.cloudflare.com/__down?bytes=50000000";
    let start_dl = Instant::now();

    // Bufferbloat: Measure latency during download
    // FIX: Use Arc<Mutex> instead of Channel to avoid deadlock when channel fills up
    let loaded_latencies_down = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    let loaded_latencies_down_clone = loaded_latencies_down.clone();

    let stop_down = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let stop_down_clone = stop_down.clone();

    let ping_task_down = tokio::spawn(async move {
        while !stop_down_clone.load(std::sync::atomic::Ordering::Relaxed) {
            let res = simple_ping("1.1.1.1");
            if let Ok(ms) = res.parse::<f32>() {
                if let Ok(mut vec) = loaded_latencies_down_clone.lock() {
                    vec.push(ms);
                }
            }
            // Ping frequently to catch buffers filling up
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
    });

    if let Ok(response) = client.get(url).send().await {
        if let Ok(bytes) = response.bytes().await {
            // Stop pinging
            stop_down.store(true, std::sync::atomic::Ordering::Relaxed);
            // We don't strictly need to await the ping task loop to exit immediately,
            // but it's good practice. It won't deadlock now because it's not blocked on a channel.
            let _ = ping_task_down.await;

            let duration = start_dl.elapsed().as_secs_f32();
            let bits = (bytes.len() as f32) * 8.0;
            let mbps = (bits / duration) / 1_000_000.0;

            window
                .emit(
                    "speed-update",
                    SpeedTestPayload {
                        phase: "download_result".into(),
                        ping_avg: Some(avg_ping as u32),
                        jitter: Some(jitter as u32),
                        packet_loss: Some(packet_loss),
                        download_speed: Some(mbps),
                        upload_speed: None,
                        progress: 1.0,
                        loaded_latency: None,
                        loaded_latency_download: None,
                        loaded_latency_upload: None,
                        client_ip: client_ip.clone(),
                        client_isp: client_isp.clone(),
                        location: location.clone(),
                    },
                )
                .unwrap();
        }
    } else {
        stop_down.store(true, std::sync::atomic::Ordering::Relaxed);
    }

    // 3. UPLOAD Phase
    let data_size = 10_000_000;
    let data: Vec<u8> = {
        let mut rng = rand::rng();
        (0..data_size).map(|_| rng.random()).collect()
    };

    let start_ul = Instant::now();
    let upload_url = "https://speed.cloudflare.com/__up";

    // Bufferbloat: Measure latency during upload
    let loaded_latencies_up = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    let loaded_latencies_up_clone = loaded_latencies_up.clone();

    let stop_up = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let stop_up_clone = stop_up.clone();

    let ping_task_up = tokio::spawn(async move {
        while !stop_up_clone.load(std::sync::atomic::Ordering::Relaxed) {
            let res = simple_ping("1.1.1.1");
            if let Ok(ms) = res.parse::<f32>() {
                if let Ok(mut vec) = loaded_latencies_up_clone.lock() {
                    vec.push(ms);
                }
            }
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
    });

    if let Ok(_res) = client.post(upload_url).body(data).send().await {
        stop_up.store(true, std::sync::atomic::Ordering::Relaxed);
        let _ = ping_task_up.await;

        let duration = start_ul.elapsed().as_secs_f32();
        let bits = (data_size as f32) * 8.0;
        let mbps = (bits / duration) / 1_000_000.0;

        // Calculate Loaded Latencies
        // Lock and copy out values
        let lat_down = loaded_latencies_down.lock().unwrap();
        let loaded_avg_down = if !lat_down.is_empty() {
            lat_down.iter().sum::<f32>() / lat_down.len() as f32
        } else {
            avg_ping
        };

        let lat_up = loaded_latencies_up.lock().unwrap();
        let loaded_avg_up = if !lat_up.is_empty() {
            lat_up.iter().sum::<f32>() / lat_up.len() as f32
        } else {
            avg_ping
        };

        // Use the worst case (max of down/up loaded latency) or average? Common test uses Max or Avg.
        // Let's use Avg of Load.
        let loaded_latency = (loaded_avg_down + loaded_avg_up) / 2.0;

        window
            .emit(
                "speed-update",
                SpeedTestPayload {
                    phase: "complete".into(),
                    ping_avg: Some(avg_ping as u32),
                    jitter: Some(jitter as u32),
                    packet_loss: Some(packet_loss),
                    download_speed: Some(mbps),
                    upload_speed: Some(mbps),
                    progress: 1.0,
                    loaded_latency: Some(loaded_latency),
                    loaded_latency_download: Some(loaded_avg_down),
                    loaded_latency_upload: Some(loaded_avg_up),
                    client_ip: client_ip.clone(),
                    client_isp: client_isp.clone(),
                    location: location.clone(),
                },
            )
            .unwrap();
    } else {
        stop_up.store(true, std::sync::atomic::Ordering::Relaxed);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            simple_ping,
            run_full_speed_test,
            ping_game_servers,
            run_dns_benchmark
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
