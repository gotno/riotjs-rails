module Riot
  module Rails
    module ViewHelper

      def riot_tag(name, options = {}, &block)
        tag = options.delete(:tag) { :div }

        options[:'riot-tag'] = name

        block_given? ? content_tag(tag, options, &block) : content_tag(tag, nil, options)
      end

    end
  end
end
