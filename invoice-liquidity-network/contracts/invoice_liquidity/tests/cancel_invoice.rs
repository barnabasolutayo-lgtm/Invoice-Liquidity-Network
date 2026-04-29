#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    fn setup_invoice(env: &Env, status: InvoiceStatus) -> Invoice {
        let freelancer = Address::random(env);
        let payer = Address::random(env);
        Invoice {
            id: 1,
            freelancer: freelancer.clone(),
            payer,
            token: Address::random(env),
            amount: 1000,
            due_date: 999999,
            discount_rate: 100,
            status,
            funder: None,
            funded_at: None,
            amount_funded: 0,
        }
    }

    #[test]
    fn freelancer_can_cancel_pending() {
        let env = Env::default();
        let mut invoice = setup_invoice(&env, InvoiceStatus::Pending);
        save_invoice(&env, &invoice);
        invoice.freelancer.require_auth();
        assert!(cancel_invoice(env.clone(), invoice.id).is_ok());
        let updated = load_invoice(&env, invoice.id);
        assert_eq!(updated.status, InvoiceStatus::Cancelled);
    }

    #[test]
    fn non_freelancer_cannot_cancel() {
        let env = Env::default();
        let mut invoice = setup_invoice(&env, InvoiceStatus::Pending);
        save_invoice(&env, &invoice);
        let other = Address::random(&env);
        // Should fail because other is not freelancer
        assert!(cancel_invoice(env.clone(), invoice.id).is_err());
    }

    #[test]
    fn cannot_cancel_funded_invoice() {
        let env = Env::default();
        let mut invoice = setup_invoice(&env, InvoiceStatus::Funded);
        save_invoice(&env, &invoice);
        invoice.freelancer.require_auth();
        let result = cancel_invoice(env.clone(), invoice.id);
        assert!(result.is_err());
    }

    #[test]
    fn cannot_cancel_cancelled_invoice() {
        let env = Env::default();
        let mut invoice = setup_invoice(&env, InvoiceStatus::Cancelled);
        save_invoice(&env, &invoice);
        invoice.freelancer.require_auth();
        let result = cancel_invoice(env.clone(), invoice.id);
        assert!(result.is_err());
    }
}