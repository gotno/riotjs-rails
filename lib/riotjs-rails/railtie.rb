require 'rails'

module Riot
  module Rails
    class Railtie < ::Rails::Railtie

      # Include the riot-rails view helper lazily
      initializer "riot_rails.setup_view_helpers", group: :all do |app|
        ActiveSupport.on_load(:action_view) do
          include ::Riot::Rails::ViewHelper
        end
      end

    end
  end
end
