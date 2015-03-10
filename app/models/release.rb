class Release < ActiveRecord::Base
  belongs_to :project, touch: true
  belongs_to :author, polymorphic: true

  before_create :assing_release_number
  after_create :push_tag_to_git_repository
  after_create :start_deploys

  def self.sort_by_version
    order(number: :desc)
  end

  def to_param
    version
  end

  def currently_deploying_stages
    project.stages.where_reference_being_deployed(version)
  end

  def deployed_stages
    @deployed_stages ||= project.stages.select {|stage| stage.current_release?(self) }
  end

  def changeset
    @changeset ||= Changeset.new(project.github_repo, previous_release.try(:commit), commit)
  end

  def previous_release
    project.release_prior_to(self)
  end

  def version
    "v#{number}"
  end

  def author
    super || NullUser.new(author_id)
  end

  def self.find_by_version(version)
    if version =~ /\Av(\d+)\Z/
      number = $1.to_i
      find_by_number(number)
    end
  end

  private

  def assing_release_number
    latest_release_number = project.releases.last.try(:number) || 0
    self.number = latest_release_number + 1
  end

  def push_tag_to_git_repository
    GITHUB.create_release(project.github_repo, version, target_commitish: commit)
  end

  def start_deploys
    deploy_service = DeployService.new(project, author)

    project.auto_release_stages.each do |stage|
      deploy_service.deploy!(stage, version)
    end
  end
end
