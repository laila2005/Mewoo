# PetPulse Database Entity-Relationship Diagram (ERD)

This is the most up-to-date, accurate, and organized Entity-Relationship Diagram for the PetPulse platform based on your PostgreSQL migrations and initialization scripts.

```mermaid
erDiagram
    %% Core Entities
    users ||--o{ vet_profiles : "has"
    users ||--o{ trainer_profiles : "has"
    users ||--o{ pets : "owns"
    
    users {
        UUID id PK
        VARCHAR email "UNIQUE"
        VARCHAR password_hash
        VARCHAR first_name
        VARCHAR last_name
        user_role role "owner | vet | trainer | admin"
        DECIMAL latitude
        DECIMAL longitude
        TIMESTAMP created_at
    }

    vet_profiles {
        UUID user_id PK, FK
        VARCHAR clinic_name
        VARCHAR license_number "UNIQUE"
        BOOLEAN is_emergency
        verification_status status
    }

    trainer_profiles {
        UUID user_id PK, FK
        TEXT array specialties
        verification_status status
    }

    pets {
        UUID id PK
        UUID owner_id FK
        VARCHAR name
        VARCHAR species
        VARCHAR breed
        INTEGER age_years
        DECIMAL weight_kg
    }

    %% Feature: Vets & Triages
    pets ||--o{ appointments : "booked for"
    vet_profiles ||--o{ appointments : "handles"
    users ||--o{ ai_triages : "performs"
    pets ||--o{ ai_triages : "subject of"

    appointments {
        UUID id PK
        UUID pet_id FK
        UUID vet_user_id FK
        appointment_status status
        TIMESTAMP appointment_time
        TEXT reason
        BOOLEAN handled_by_ai
    }
    
    ai_triages {
        UUID id PK
        UUID user_id FK
        UUID pet_id FK
        VARCHAR symptom_summary
        VARCHAR severity_level
        JSONB recommended_action
        TIMESTAMP created_at
    }

    %% Feature: Lost & Found
    pets ||--o| lost_pets : "reported as"
    users ||--o{ found_reports : "reports"
    lost_pets ||--o{ found_reports : "matches"

    lost_pets {
        UUID id PK
        UUID pet_id FK
        lost_pet_status status "lost | found | resolved"
        DECIMAL latitude
        DECIMAL longitude
        TIMESTAMP lost_time
    }

    found_reports {
        UUID id PK
        UUID reporter_id FK
        UUID lost_pet_id FK
        DECIMAL latitude
        DECIMAL longitude
        TIMESTAMP found_time
        DECIMAL ai_match_score
        found_report_status status "open | verified | closed"
    }

    %% Feature: Marketplace & Services
    trainer_profiles ||--o{ services : "provides"
    users ||--o{ service_bookings : "books"
    services ||--o{ service_bookings : "receives"
    
    users ||--o{ shops : "owns"
    shops ||--o{ products : "sells"
    shops ||--o{ marketplace_products : "lists"

    services {
        UUID id PK
        UUID provider_id FK
        VARCHAR title
        service_category category "walking | sitting | training"
        DECIMAL base_price
    }

    service_bookings {
        UUID id PK
        UUID client_id FK
        UUID service_id FK
        booking_status status
        TIMESTAMP start_time
        TIMESTAMP end_time
        DECIMAL total_price
    }

    shops {
        UUID id PK
        UUID vendor_id FK
        VARCHAR shop_name
        verification_status status
    }

    products {
        UUID id PK
        UUID shop_id FK
        VARCHAR name
        DECIMAL price
        INTEGER stock
    }

    marketplace_products {
        VARCHAR id PK
        VARCHAR title
        VARCHAR category
        DECIMAL base_price
        DECIMAL rating
    }

    %% Feature: Payments & Subscriptions
    service_bookings ||--o| payments : "generates"
    users ||--o{ payments : "makes/receives"
    users ||--o{ user_subscriptions : "subscribes"
    subscription_plans ||--o{ user_subscriptions : "defines"

    payments {
        UUID id PK
        UUID booking_id FK
        UUID payer_id FK
        UUID payee_id FK
        DECIMAL amount
        VARCHAR currency
        payment_status status
    }

    user_subscriptions {
        UUID id PK
        UUID user_id FK
        VARCHAR plan_id FK
        VARCHAR plan_name
        NUMERIC price
        TIMESTAMP next_billing_date
    }

    subscription_plans {
        VARCHAR id PK
        VARCHAR name
        NUMERIC price
        VARCHAR frequency
    }

    %% Feature: Community & Chat
    users ||--o{ community_posts : "creates"
    users ||--o{ chat_requests : "sends/receives"
    users ||--o{ messages : "sends/receives"

    community_posts {
        UUID id PK
        UUID user_id FK
        TEXT content
        INTEGER likes_count
    }

    chat_requests {
        UUID id PK
        UUID sender_id FK
        UUID receiver_id FK
        chat_request_status status
    }

    messages {
        UUID id PK
        UUID sender_id FK
        UUID receiver_id FK
        TEXT content
        BOOLEAN is_read
    }

    %% Feature: Mating & Adoptions
    pets ||--o| adoptable_pets : "listed as"
    pets ||--o| mating_requests : "requests"

    adoptable_pets {
        UUID id PK
        UUID pet_id FK
        VARCHAR status "available"
        TEXT reason
    }

    mating_requests {
        UUID id PK
        UUID pet_id FK
        VARCHAR status "seeking"
        TEXT preferences
    }
```
