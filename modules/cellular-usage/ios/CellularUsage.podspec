Pod::Spec.new do |s|
  s.name           = 'CellularUsage'
  s.version        = '1.0.0'
  s.summary        = 'Read iOS cellular interface byte counters'
  s.description    = 'A local Expo module exposing aggregate iOS cellular interface counters.'
  s.author         = 'Connection Limiter'
  s.homepage       = 'https://github.com/KafackLolys/connection-limiter'
  s.license        = { :type => 'MIT' }
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/KafackLolys/connection-limiter.git', :tag => s.version.to_s }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
