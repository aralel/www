# Sets `site.release_version` to a short hash of the CSS/JS/manifest/service-worker
# sources. Templates append it as ?v= to those assets and the service worker uses it
# as its cache name, so browsers re-download them (and the service worker updates)
# only when one of these files actually changed, not on every content deploy.
#
# Where plugins don't run (classic GitHub Pages), templates fall back to the build
# time, as before.

require "digest"

module AssetVersion
  VERSIONED_ASSETS = %w[
    styles.css animations.css script.js animations.js cookie-consent.js
    manifest.json service-worker.js
  ].freeze
end

Jekyll::Hooks.register :site, :post_read do |site|
  next if site.config["release_version"] # an explicit value in _config.yml wins

  asset_digest = Digest::SHA256.new
  AssetVersion::VERSIONED_ASSETS.each do |asset_path|
    full_path = File.join(site.source, asset_path)
    asset_digest.update(asset_path)
    asset_digest.update(File.binread(full_path)) if File.exist?(full_path)
  end
  site.config["release_version"] = asset_digest.hexdigest[0, 12]
end
