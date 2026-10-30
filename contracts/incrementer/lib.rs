#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// PortalHouse Incrementer — a minimal real ink! contract for the Deploy
/// Contract module. The constructor stores a starting value (the one figure
/// you set); `inc` and `set` mutate it, `get` reads it back.
#[ink::contract]
mod incrementer {
    #[ink(storage)]
    pub struct Incrementer {
        value: i32,
    }

    impl Incrementer {
        /// Deploy with a starting value — this is the number you set in the UI.
        #[ink(constructor)]
        pub fn new(init_value: i32) -> Self {
            Self { value: init_value }
        }

        /// Deploy starting from zero.
        #[ink(constructor)]
        pub fn default() -> Self {
            Self { value: 0 }
        }

        /// Increase the stored value by `by`.
        #[ink(message)]
        pub fn inc(&mut self, by: i32) {
            self.value = self.value.saturating_add(by);
        }

        /// Overwrite the stored value.
        #[ink(message)]
        pub fn set(&mut self, new_value: i32) {
            self.value = new_value;
        }

        /// Read the current stored value.
        #[ink(message)]
        pub fn get(&self) -> i32 {
            self.value
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn new_works() {
            let c = Incrementer::new(42);
            assert_eq!(c.get(), 42);
        }

        #[ink::test]
        fn inc_works() {
            let mut c = Incrementer::new(0);
            c.inc(5);
            assert_eq!(c.get(), 5);
        }
    }
}
