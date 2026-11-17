CREATE TABLE IF NOT EXISTS cms_admin (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  open_id VARCHAR(255) NULL,
  email VARCHAR(320) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cms_admin_open_id (open_id),
  CONSTRAINT chk_cms_admin_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO cms_admin (id, open_id, email) VALUES (1, NULL, NULL);

CREATE TABLE IF NOT EXISTS cms_media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  object_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(32) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  owner_open_id VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cms_media_object_key (object_key),
  KEY ix_cms_media_owner (owner_open_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_posts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  excerpt VARCHAR(500) NOT NULL,
  category VARCHAR(100) NOT NULL,
  cover_url VARCHAR(500) NOT NULL DEFAULT '',
  cover_alt VARCHAR(255) NOT NULL DEFAULT '',
  body_html LONGTEXT NOT NULL,
  seo_title VARCHAR(70) NOT NULL DEFAULT '',
  seo_description VARCHAR(180) NOT NULL DEFAULT '',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  published_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cms_posts_slug (slug),
  KEY ix_cms_posts_public (status, featured, published_at),
  KEY ix_cms_posts_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
