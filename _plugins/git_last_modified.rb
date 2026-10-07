# Sets `page.last_modified_at` from git history so sitemap.xml can emit a real
# <lastmod> instead of the build time for every URL.
#
# A page's date is the newest commit touching the page file itself or, for pages
# rendered from shared data (everything except legal pages and layout-less files),
# anything under _data/. Uncommitted edits are ignored: the date only moves once
# the change is committed.
#
# Needs full git history at build time (`fetch-depth: 0` in CI). Without git, or in
# safe mode (classic GitHub Pages ignores _plugins/), nothing is set and
# sitemap.xml simply leaves <lastmod> out.

require "open3"
require "time"

module GitLastModified
  DATA_DRIVEN_EXCLUDED_LAYOUTS = %w[legal none].freeze

  class << self
    def commit_time_for(site_source, relative_path)
      @commit_times ||= {}
      @commit_times.fetch(relative_path) do
        stdout, _stderr, status = Open3.capture3(
          "git", "-C", site_source, "log", "-1", "--format=%cI", "--", relative_path
        )
        timestamp = status.success? ? stdout.strip : ""
        @commit_times[relative_path] = timestamp.empty? ? nil : Time.parse(timestamp)
      end
    end

    def git_available?(site_source)
      return @git_available unless @git_available.nil?

      _stdout, _stderr, status = Open3.capture3("git", "-C", site_source, "rev-parse", "--is-inside-work-tree")
      @git_available = status.success?
    rescue Errno::ENOENT
      @git_available = false
    end
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  next unless GitLastModified.git_available?(site.source)

  site.pages.each do |page|
    next unless page.html? || page.url.end_with?("/")

    candidate_times = [GitLastModified.commit_time_for(site.source, page.relative_path)]
    unless GitLastModified::DATA_DRIVEN_EXCLUDED_LAYOUTS.include?(page.data["layout"].to_s)
      candidate_times << GitLastModified.commit_time_for(site.source, "_data")
    end

    newest_time = candidate_times.compact.max
    page.data["last_modified_at"] = newest_time if newest_time && !page.data.key?("last_modified_at")
  end
end
